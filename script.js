import { Client } from "@notionhq/client";
import { config } from "dotenv";

config();

const apiKey = process.env.NOTION_API_KEY;
let pageId = "13d5bd99c0eb804d9823ef86fa538f32"; // ML for SE


const notion = new Client({ auth: apiKey });


async function main() {
  const blockId = pageId; // Blocks can be appended to other blocks *or* pages. Therefore, a page ID can be used for the block_id parameter
  const newHeadingResponse = await notion.blocks.children.append({
    block_id: blockId,
    // Pass an array of blocks to append to the page: https://developers.notion.com/reference/block#block-type-objects
    children: [
      {
        image: {
          type: "external",
          external: {
            url: "https://www.dropbox.com/scl/fi/yzhzk5ma2niiqtz7o58zg/1.png?rlkey=l80tfulc8dvbytws5c4pyxbuc&st=9e1obfbo&dl=1"
          }
        },
      },
    ],
  });

  // Print the new block(s) response
  console.log(newHeadingResponse);
}

main();
