require("@nomiclabs/hardhat-waffle");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.18",
  },
  paths: {
    artifacts: "./user/src/artifacts",
  },
};
