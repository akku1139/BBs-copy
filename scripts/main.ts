import type { WP_REST_API_Posts } from "./types/wp.ts";
import "./types/deno.d.ts";

const sleepMs = (ms: Number) => new Promise(resolve => setTimeout(resolve, ms));

const firstRes = await fetch("https://blogbooks.net/wp-json/wp/v2/posts?page=1&per_page=100");
let posts: WP_REST_API_Posts = await firstRes.json();

const totalPages = Number(firstRes.headers.get("X-Wp-Totalpages"));

for(let i = 2; i < (totalPages + 1); i++) {
  console.log(`page: ${i}`);
  posts.concat(await (await fetch(`https://blogbooks.net/wp-json/wp/v2/posts?page=${i}&per_page=100`)).json());
}

posts.forEach((post) => {
  // Write Raw Datas
  Deno.writeTextFile(`./raw/${post.id}.json`, JSON.stringify(post));

  // Write Contents
  Deno.writeTextFile(`./content/pool/${post.id}.html`, JSON.stringify({
    date: post.date,
    draft: false,
    params: {
      author: post.author
    },
    title: post.title.rendered,
    summary: post.excerpt.rendered,
    url: new URL(post.link).pathname,
    tags: post.nishiki_blocks_pro.terms.map((t) => t.slug),
    categories: post.nishiki_blocks_pro.terms.map((t) => t.name),
  }) + "\n" + post.content.rendered.replaceAll("https://blogbooks.net/wp-content/", "/wp-content/")
    + `\r元記事: <a href="${post.link}">${post.link}</a>`);

  // Fetch resources
  [...new Set(
    // post.content.rendered.match(/"https:\/\/blogbooks\.net\/wp-content\/(.+?)"/g) ?? [])
    post.content.rendered.match(/https:\/\/blogbooks\.net\/wp-content\/(.+?)["\s]/g)  ?? [])
  ].map((u) => u.slice(0, -1)).forEach(async (url) => {
    const path = "./static" + new URL(url).pathname;

    await Deno.mkdir(path.split("/").slice(0, -1).join("/"), {recursive: true});
    // /^\/.+\//.exec(path)[0]

    let res: Response;

    for(let i = 0; i < 10; i++) {
      try {
        res = await fetch(url);
        break;
      } catch(e: Error) {
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
  });
});
