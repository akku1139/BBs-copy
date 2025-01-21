import type { WP_REST_API_Posts } from "./types/wp.ts";
import "./types/deno.d.ts";
import { unescape } from "jsr:@std/html/entities"

const sleepMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fileExists = async (path: string): Promise<boolean> => {
  try {
    const file = await Deno.stat(path);
    return file.isFile;
  } catch (e) {
    return false;
  }
};

const firstRes = await fetch("https://blogbooks.net/wp-json/wp/v2/posts?page=1&per_page=100");
let posts: WP_REST_API_Posts = await firstRes.json();

const totalPages = Number(firstRes.headers.get("X-Wp-Totalpages"));

for(let i = 2; i < (totalPages + 1); i++) {
  await sleepMs(5000);
  console.log(`page: ${i}`);
  posts = [...posts, ...(await (await fetch(`https://blogbooks.net/wp-json/wp/v2/posts?page=${i}&per_page=100`)).json())];
}

posts.forEach((post) => {
  // Write Contents
  Deno.writeTextFile(`./content/pool/${post.id}.html`, JSON.stringify({
    date: post.date,
    draft: false,
    params: {
      author: post.author
    },
    title: unescape(post.title.rendered),
    summary: post.excerpt.rendered,
    url: decodeURIComponent(new URL(post.link).pathname),
    tag: post.nishiki_blocks_pro.terms.map((t) => decodeURIComponent(t.slug)),
    category: post.nishiki_blocks_pro.category.map((t) => t.name),
  }, null, 2) + "\n" + post.content.rendered.replaceAll("https://blogbooks.net/wp-content/", "/wp-content/")
    + `\n元記事: <a href="${post.link}">${post.link}</a>`);

  // Fetch resources
  [...new Set(
    // post.content.rendered.match(/"https:\/\/blogbooks\.net\/wp-content\/(.+?)"/g) ?? [])
    post.content.rendered.match(/https:\/\/blogbooks\.net\/wp-content\/(.+?)["\s<]/g)  ?? [])
  ].map((u) => u.slice(0, -1)).forEach(async (url, index) => setTimeout(async () => {
    const path = "./static" + new URL(url).pathname;

    if(await fileExists(path)) {
      return;
    }
    console.log("Fetch ", path);

    await Deno.mkdir(path.split("/").slice(0, -1).join("/"), {recursive: true});
    // /^\/.+\//.exec(path)[0]

    let res: Response;

    for(let i = 0; i < 10; i++) {
      try {
        res = await fetch(url);
        break;
      } catch(e) {
        console.log(e);
        await sleepMs(5000);
      }
    }

    if(!res.ok) {
      console.error("HTTP Error", res.url, res.status, res.statusText);
      return;
    }

    Deno.writeFile(
      path,
      (res).body,
      {write: true, createNew: true}
    ).catch((e:Error) => {
      if(e.name === "AlreadyExists") {
        return
      }
      console.log(e);
    });
  }, 1000));
});
