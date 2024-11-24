//import pdf2image from 'pdf2image';
import { pdfToPng } from "pdf-to-png-converter";

const convertPDF = async () => {
  const pngPages = await pdfToPng('example.pdf', { // The function accepts PDF file path or a Buffer
      disableFontFace: false, // When `false`, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. Default value is true.
      useSystemFonts: false, // When `true`, fonts that aren't embedded in the PDF document will fallback to a system font. Default value is false.
      viewportScale: 1.0, // The desired scale of PNG viewport. Default value is 1.0.
      outputFolder: 'output/', // Folder to write output PNG files. If not specified, PNG output will be available only as a Buffer content, without saving to a file.
      verbosityLevel: 0 // Verbosity level. ERRORS: 0, WARNINGS: 1, INFOS: 5. Default value is 0.
  });
  // Further processing of pngPages
  return pngPages[0].content;
};

convertPDF();