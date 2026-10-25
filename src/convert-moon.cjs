const sharp = require("sharp");

const input =
  "public/textures/WAC_GLOBAL_E000N0000_008P.TIF";

const output =
  "public/textures/moon-lro.png";

sharp(input)
  .png({
    compressionLevel: 9,
  })
  .toFile(output)
  .then((info) => {
    console.log("NASA Moon texture created!");
    console.log(info);
  })
  .catch((error) => {
    console.error("Conversion failed:");
    console.error(error);
  });