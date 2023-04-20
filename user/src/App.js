import { useEffect, useState } from "react";

import { ethers } from "ethers";

import artifact from "./artifacts/contracts/Staking.sol/Staking.json";
import linkArtifact from "./artifacts/contracts/Chainlink.sol/Chainlink.json";
import usdtArtifact from "./artifacts/contracts/Tether.sol/Tether.json";
import usdcArtifact from "./artifacts/contracts/USDCoin.sol/USDCoin.json";
import wbtcArtifact from "./artifacts/contracts/WrappedBTC.sol/WrappedBTC.json";
import wethArtifact from "./artifacts/contracts/WrappedETH.sol/WrappedETH.json";

import "./App.css";

import StakeModal from "./compontents/StakingModel";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const LINK_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const USDT_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
const USDC_ADDRESS = "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9";
const WBTC_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const WETH_ADDRESS = "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707";

const LINKimage = "https://cryptologos.cc/logos/chainlink-link-logo.png";
const WBTCIMAGE = "https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png";

function App() {
  const [provider, setProvider] = useState(undefined);

  const [signer, setSigner] = useState(undefined);

  const [contract, setContract] = useState(undefined);

  const toEther = (wei) =>
    Number(ethers.utils.formatEther(String(wei))).toFixed(2);

  const [tokenSymbols, setTokenSymbols] = useState([]);

  const [tokens, setTokens] = useState({});

  const [stakedTokens, setStakedTokens] = useState({});

  const [assetIds, setAssetIds] = useState([]);
  const [assets, setAssets] = useState([]);

  const [showStakeModal, setShowStakeModal] = useState(false);

  const [stakeTokenSymbol, setStakeTokenSymbol] = useState(undefined);

  const [stakeTokenQuantity, setStakeTokenQuantity] = useState(undefined);

  const [tokenContracts, setTokenContracts] = useState({});

  useEffect(() => {
    const onLoad = async () => {
      const provider = await new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      const contract = await new ethers.Contract(
        CONTRACT_ADDRESS,
        artifact.abi,
        provider
      );
      setContract(contract);

      const linkContract = await new ethers.Contract(
        LINK_ADDRESS,
        linkArtifact.abi,
        provider
      );
      const usdtContract = await new ethers.Contract(
        USDT_ADDRESS,
        usdtArtifact.abi,
        provider
      );
      const usdcContract = await new ethers.Contract(
        USDC_ADDRESS,
        usdcArtifact.abi,
        provider
      );
      const wbtcContract = await new ethers.Contract(
        WBTC_ADDRESS,
        wbtcArtifact.abi,
        provider
      );
      const wethContract = await new ethers.Contract(
        WETH_ADDRESS,
        wethArtifact.abi,
        provider
      );
      setTokenContracts((prev) => ({ ...prev, LINK: linkContract }));
      setTokenContracts((prev) => ({ ...prev, USDT: usdtContract }));
      setTokenContracts((prev) => ({ ...prev, USDC: usdcContract }));
      setTokenContracts((prev) => ({ ...prev, WBTC: wbtcContract }));
      setTokenContracts((prev) => ({ ...prev, WETH: wethContract }));

      const tokenSymbols = await contract.getTokenSymbols();
      setTokenSymbols(tokenSymbols);
      console.log(Object.keys(tokens).length);
      console.log(tokenSymbols.length);
      tokenSymbols.map(async (symbol) => {
        const token = await contract.getToken(symbol);
        setTokens((prev) => ({ ...prev, [symbol]: token }));

        const stakedAmount = await contract.stakedToken(symbol);
        setStakedTokens((prev) => ({
          ...prev,
          [symbol]: toEther(stakedAmount),
        }));
      });
    };
    onLoad();
  }, []);

  const isConnected = () => signer !== undefined;

  const getSigner = async () => {
    const signer = provider.getSigner();
    setSigner(signer);
    return signer;
  };

  const connectAndLoad = async () => {
    const signer = await getSigner(provider);
    setSigner(signer);

    const assetIdsHex = await contract
      .connect(signer)
      .getPositionIdsForAddress();
    console.log(assetIdsHex);
    const AssetIds = assetIdsHex.map((id) => Number(id));
    setAssetIds(AssetIds);
    console.log(AssetIds);

    const queriedAssets = await Promise.all(
      AssetIds.map((id) => contract.connect(signer).getPositionById(Number(id)))
    );
    console.log(queriedAssets);
    queriedAssets.map(async (asset) => {
      const tokensStaked = toEther(asset.tokenQuantity);
      console.log(tokensStaked);
      const ethAccruedInterestWei = await calcAccruedInterest(
        asset.apy,
        asset.ethValue,
        asset.createdDate
      );
      console.log(asset.createdDate);
      const ethAccruedInterest = toEther(ethAccruedInterestWei);

      const usdAccruedInterest = (
        (ethAccruedInterest * tokens["WETH"].usdPrice) /
        100
      ).toFixed(2);
      console.log(usdAccruedInterest);
      const parsedAsset = {
        positionId: Number(asset.positionId),
        tokenName: asset.name,
        tokenSymbol: asset.symbol,
        createdDate: asset.createdDate,
        apy: asset.apy / 100,
        tokensStaked: tokensStaked,
        usdValue: toEther(asset.usdValue) / 100,
        usdAccruedInterest: usdAccruedInterest,
        ethAccruedInterest: ethAccruedInterest,
        open: asset.open,
      };
      console.log(parsedAsset);
      setAssets((prev) => [...prev, parsedAsset]);
    });
  };

  const calcAccruedInterest = async (apy, value, createdDate) => {
    const numberOfDays = await contract.calculateNumberDays(createdDate);
    const accruedInterest = await contract.calculateInterest(
      apy,
      value,
      numberOfDays
    );
    return Number(accruedInterest);
  };

  const openStakingModal = (tokenSymbol) => {
    setShowStakeModal(true);
    setStakeTokenSymbol(tokenSymbol);
  };

  const stakeTokens = async () => {
    const stakeTokenQuantityWei = ethers.utils.parseEther(stakeTokenQuantity);
    await tokenContracts[stakeTokenSymbol]
      .connect(signer)
      .approve(contract.address, stakeTokenQuantityWei);
    contract
      .connect(signer)
      .stakedTokens(stakeTokenSymbol, stakeTokenQuantityWei);
  };

  const withdraw = (positionId) => {
    contract.connect(signer).closePosition(positionId);
  };

  const tokenRow = (tokenSymbol) => {
    const token = tokens[tokenSymbol];
    const amountStaked = Number(stakedTokens[tokenSymbol]);

    return (
      <div className="row">
        <div className="col-md-2">{displayLogo(token?.symbol)}</div>
        <div className="col-md-2">{token?.symbol}</div>
        <div className="col-md-2">
          {(Number(token?.usdPrice) / 100).toFixed(0)}
        </div>
        <div className="col-md-2">{amountStaked}</div>
        <div className="col-md-2">{(Number(token?.apy) / 100).toFixed(0)}%</div>
        <div className="col-md-2">
          {isConnected() && (
            <div
              className="orangeMiniButton"
              onClick={() => openStakingModal(tokenSymbol, "12%")}
            >
              Stake
            </div>
          )}
        </div>
      </div>
    );
  };

  const displayLogo = (symbol) => {
    if (symbol === "LINK") {
      return (
        <>
          <img className="logoImg" src={LINKimage} alt="LINK" />
        </>
      );
    } else if (symbol === "USDT") {
      return (
        <>
          <img className="logoImg" src="usdt.webp" alt="USDT" />
        </>
      );
    } else if (symbol === "USDC") {
      return (
        <>
          <img className="logoImg" src="usdc.webp" alt="USDC" />
        </>
      );
    } else if (symbol === "WBTC") {
      return (
        <>
          <img className="logoImg" src={WBTCIMAGE} alt="WBTC" />
        </>
      );
    } else if (symbol === "WETH") {
      return (
        <>
          <img className="logoImg" src="weth.webp" alt="WETH" />
        </>
      );
    }
  };

  return (
    <div className="App">
      <div className="marketContainer">
        <div className="subContainer">
          <span>
            <img className="logoImg" src={WBTCIMAGE} alt="logo" />
          </span>
          <span className="marketHeader">Ethereum Market</span>
        </div>

        <div>
          <div className="row columnHeaders">
            <div className="col-md-2">Asset</div>
            <div className="col-md-2">Symbol</div>
            <div className="col-md-2">Price (USD)</div>
            <div className="col-md-2">Total Supplied</div>
            <div className="col-md-2">APY</div>
            <div className="col-md-2"></div>
          </div>
        </div>
        <div>
          {tokenSymbols.length > 0 &&
            Object.keys(tokens).length > 0 &&
            tokenSymbols.map((a, idx) => <div>{tokenRow(a)}</div>)}
        </div>
      </div>

      <div className="assetContainer">
        {isConnected() ? (
          <>
            <div className="subContainer">
              <span className="marketHeader stakedTokensHeader">
                Staked Assets
              </span>
            </div>
            <div>
              <div>
                <div className="row columnHeaders">
                  <div className="col-md-1">Asset</div>
                  <div className="col-md-2">Tokens Staked</div>
                  <div className="col-md-2">Market Value (USD)</div>
                  <div className="col-md-2">Accrued Interest (USD)</div>
                  <div className="col-md-2">Accrued Interest (ETH)</div>
                  <div className="col-md-2"></div>
                </div>
              </div>
              <br />
              {assets.length > 0 &&
                assets.map((a, idx) => (
                  <div className="row">
                    <div className="col-md-1">{displayLogo(a.tokenSymbol)}</div>
                    <div className="col-md-2">{a.tokensStaked}</div>
                    <div className="col-md-2">{a.usdValue}</div>
                    <div className="col-md-2">{a.usdAccruedInterest}</div>
                    <div className="col-md-2">{a.ethAccruedInterest}</div>
                    <div className="col-md-2">
                      {a.open ? (
                        <div
                          onClick={() => withdraw(a.positionId)}
                          className="orangeMiniButton"
                        >
                          Withdraw
                        </div>
                      ) : (
                        <span>closed</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <div onClick={() => connectAndLoad()} className="connectButton">
            Connect Wallet
          </div>
        )}
      </div>
      {showStakeModal && (
        <StakeModal
          onClose={() => setShowStakeModal(false)}
          stakeTokenSymbol={stakeTokenSymbol}
          setStakeTokenQuantity={setStakeTokenQuantity}
          stakeTokens={stakeTokens}
        />
      )}
    </div>
  );
}

export default App;
