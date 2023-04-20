const { ethers } = require("hardhat");

async function main() {
  [owner] = await ethers.getSigners();

  const Staking = await ethers.getContractFactory("Staking", owner);

  const staking = await Staking.deploy(20584, {
    value: ethers.utils.parseEther("100"),
  });

  const Chainlink = await ethers.getContractFactory("Chainlink", owner);
  chainlink = await Chainlink.deploy();
  const Tether = await ethers.getContractFactory("Tether", owner);
  tether = await Tether.deploy();
  const UsdCoin = await ethers.getContractFactory("USDCoin", owner);
  usdCoin = await UsdCoin.deploy();
  const WrappedBitcoin = await ethers.getContractFactory("WrappedBTC", owner);
  wrappedBitcoin = await WrappedBitcoin.deploy();
  const WrappedEther = await ethers.getContractFactory("WrappedETH", owner);
  wrappedEther = await WrappedEther.deploy();

  console.log("Staking:", staking.address);
  console.log("Chainlink:", chainlink.address);
  console.log("Tether:", tether.address);
  console.log("UsdCoin:", usdCoin.address);
  console.log("WrappedBitcoin:", wrappedBitcoin.address);
  console.log("WrappedEther:", wrappedEther.address);

  await staking
    .connect(owner)
    .addToken("Chainlink", "LINK", chainlink.address, 77962, 1500);
  await chainlink
    .connect(owner)
    .approve(staking.address, ethers.utils.parseEther("100")); // approve ...send amount of chainlink staking address
  await staking
    .connect(owner)
    .stakedTokens("LINK", ethers.utils.parseEther("100"));

  await staking
    .connect(owner)
    .addToken("WrappedBTC", "WBTC", wrappedBitcoin.address, 2902690, 1500);
  await wrappedBitcoin
    .connect(owner)
    .approve(staking.address, ethers.utils.parseEther("100")); // approve ...send amount of WBTC staking address
  await staking
    .connect(owner)
    .stakedTokens("WBTC", ethers.utils.parseEther("100"));

  // await wrappedEther
  //   .connect(owner)
  //   .approve(staking.address, ethers.utils.parseEther("10"));
  // await staking
  //   .connect(owner)
  //   .stakedTokens("WETH", ethers.utils.parseEther("10"));

  const provider = waffle.provider;
  const block = await provider.getBlock();
  const newCreatedDate = block.timestamp - 86400 * 365;
  await staking.connect(owner).modifyCreatedDate(1, newCreatedDate);
  await staking.connect(owner).modifyCreatedDate(2, newCreatedDate);
  await staking.connect(owner).modifyCreatedDate(3, newCreatedDate);
}

// npx hardhat run --network localhost scripts/deploy.js

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
