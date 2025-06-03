//import pdf2image from 'pdf2image';
import { pdfToPng } from "pdf-to-png-converter";
import { Dropbox } from "dropbox";
import { config } from "dotenv";
import { Client } from "@notionhq/client";
import fs from "fs";

config();

//const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
const args = process.argv.slice(2);
const notionApiKey = process.env.NOTION_API_KEY;

// Page id's for the notebooks
// let pageId = "13d5bd99c0eb804d9823ef86fa538f32"; // ML for SE
// let  pageId = "13d5bd99c0eb808a8351ee7f10617b0c"; // DA

let pageId = "1de5bd99c0eb80558711dcb5608a1179"; // Testing

if (args.length === 0) {
  console.log("Please provide a file path");
  process.exit(1);
}

// Step 1: convert each PDF page to a PNG
async function convertPDF(path) {
  const pngPages = await pdfToPng(path, {
    // The function accepts PDF file path or a Buffer
    disableFontFace: true, // When `false`, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. Default value is true.
    useSystemFonts: false, // When `true`, fonts that aren't embedded in the PDF document will fallback to a system font. Default value is false.
    viewportScale: 2.0, // The desired scale of PNG viewport. Default value is 1.0.
    outputFolder: "output/", // Folder to write output PNG files. If not specified, PNG output will be available only as a Buffer content, without saving to a file.
    verbosityLevel: 0, // Verbosity level. ERRORS: 0, WARNINGS: 1, INFOS: 5. Default value is 0.
  });
  return pngPages[0].content;
} 

await convertPDF(args[0]);

// Step 2: upload each PNG to Dropbox
const dbx = new Dropbox({
  accessToken: process.env.DROPBOX_ACCESS_TOKEN,
  fetch,
});
const notion = new Client({ auth: notionApiKey });


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function uploadFileDropbox(path) {
  try {
    const fileName = "/" + path.split("/")[1];
    const uploadResponse = await dbx.filesUpload({
      path: fileName,
      contents: fs.readFileSync(path),
      mode: "overwrite",
    });

    const existingLinks = await dbx.sharingListSharedLinks({
      path: uploadResponse.result.path_display,
      direct_only: true,
    });

    if (existingLinks.result.links.length > 0) {
      const externalLink = existingLinks.result.links[0].url;
      return externalLink.slice(0, -1) + "1"; // Replace dl=0 with dl=1 to force download
    } else {
      const shareResponse = await dbx.sharingCreateSharedLinkWithSettings({
        path: uploadResponse.result.path_display,
        settings: {
          requested_visibility: "public",
          audience: "public",
          access: "viewer",
        },
      });
      return shareResponse.result.url.slice(0, -1) + "1"; // Replace dl=0 with dl=1 to force download
    }
  } catch (error) {
    if (error.status === 429) {
      const retryAfter = parseInt(error.headers.get('retry-after') || '15');
      console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`);
      await delay(retryAfter * 1000);
    } else {
      console.error("Error during upload:", error);
    }
  }
}

// Step 3: Create a new page in Notion and add each PNG as a child block
async function createChildPage(parentId) {
  try {
    const newPage = await notion.pages.create({
      parent: {
        page_id: parentId,
      },
      properties: {
        title: {
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: "Auto",
              },
            },
          ],
        },
      },
    });
    return newPage;
  } catch (error) {
    console.error(`Error on creating new Notion page ${error.body}`);
  }
}

async function appendImageBlock(pageId, imgPath) {
  try {
    const newHeadingResponse = await notion.blocks.children.append({
      block_id: pageId,
      // Pass an array of blocks to append to the page: https://developers.notion.com/reference/block#block-type-objects
      children: [
        {
          image: {
            type: "external",
            external: {
              url: imgPath,
            },
          },
        },
      ],
    });
  } catch (error) {
    console.error(`Error on appending new block ${error}`);
  }
}

const childPage = await createChildPage(pageId);

// Step 4: Process files in order
function getPageNumber(filename) {
  const match = filename.match(/_page_(\d+)\.png$/i);
  return match ? parseInt(match[1]) : 0;
}

function naturalSort(files) {
  return files.sort((a, b) => {
    const pageA = getPageNumber(a);
    const pageB = getPageNumber(b);
    
    if (pageA === pageB) {
      // If page numbers are the same or not found, sort alphabetically
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }
    return pageA - pageB;
  });
}

async function processFiles(files) {
  const sortedFiles = naturalSort(files);
  return sortedFiles;
}

const files = await fs.promises.readdir("output");
const sortedFiles = await processFiles(files);
// Iterate through the file names
for (const file of sortedFiles) {
  const externalLink = await uploadFileDropbox(`output/${file}`);
  await appendImageBlock(childPage.id, externalLink);
}
