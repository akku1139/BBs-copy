import type { WP_REST_API_Posts } from "./types/wp.ts";

const firstRes = await fetch("https://blogbooks.net/wp-json/wp/v2/posts?page=1&per_page=100");
let posts: WP_REST_API_Posts = await firstRes.json();

const totalPages = Number(firstRes.headers.get("X-Wp-Totalpages"));

for(let i = 2; i < (totalPages + 1); i++) {
  console.log(`page: ${i}`);
  posts.concat(await (await fetch(`https://blogbooks.net/wp-json/wp/v2/posts?page=${i}&per_page=100`)).json());
}

posts.forEach((post) => {
  Deno.writeTextFile(`./raw/${post.id}.json`, JSON.stringify(post));
  Deno.writeTextFile(`./content/pool/${post.id}.html`, JSON.stringify({
    date: post.date,
    draft: false,
    params: {
      author: post.author
    },
    title: post.title.rendered,
    summary: post.excerpt.rendered
  }) + "\n" + post.content.rendered);
});
