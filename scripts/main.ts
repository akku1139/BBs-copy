import type { WP_REST_API_Posts } from "./types/wp.ts";

const firstRes = await fetch("https://blogbooks.net/wp-json/wp/v2/posts?page=1&per_page=100");
let posts: WP_REST_API_Posts = await firstRes.json();

let totalCount = Number(firstRes.headers.get("X-WP-Total"));

while(totalCount > 0) {

}
