/* global artifacts web3 */

var abi = require("ethereumjs-abi");

const StreakBankContract = artifacts.require("StreakBank");
const BN = web3.utils.BN;
const { providers, deployConfigs } = require("../deploy.config");


/** @dev truffle may use network name as "kovan-fork", for example, so we need to get the correct name to be used in the configs */
function getNetworkName(network) {

    if (Object.prototype.toString.call(network) !== "[object String]") {
        throw new Error(`Invalid value type for parameter "${network}"`);
    }

    const name = network.toLowerCase();
    if (name.includes("kovan")) return "kovan";
    if (name.includes("ropsten")) return "ropsten";
    if (name.includes("mainnet")) return "mainnet";
    if (name.includes("polygon")) return "polygon";
    if (name.includes("alfajores")) return "alfajores";
    if (name.includes("celo")) return "celo";

    throw new Error(`Unsupported network "${network}"`);
}

function printSummary(
    // contract's constructor parameters
    {
        inboundCurrencyAddress,
        lendingPoolAddressProvider,
        minSegmentForReward,
        segmentLength,
        aaveContractAddress,
    },
    // additional logging info
    {
        networkName,
        selectedProvider,
        inboundCurrencySymbol,
        owner,
    }

) {
    var parameterTypes = [
        "address", // inboundCurrencyAddress
        "address", // lendingPoolAddressProvider
        "uint256", // minSegmentForReward
        "uint256", // segmentLength
        "address", // dataProvider/lending pool address
    ];
    var parameterValues = [
        inboundCurrencyAddress,
        lendingPoolAddressProvider,
        minSegmentForReward,
        segmentLength,
        aaveContractAddress
    ];

    var encodedParameters = abi.rawEncode(parameterTypes, parameterValues);

    console.log("\n\n\n----------------------------------------------------");
    console.log("StreakBank deployed with the following arguments:");
    console.log("----------------------------------------------------\n");
    console.log(`Network Name: ${networkName}`);
    console.log(`Contract's Owner: ${owner}`);
    console.log(`Lending Pool: ${selectedProvider}`);
    console.log(`Lending Pool Address Provider: ${lendingPoolAddressProvider}`);
    console.log(`Inbound Currency: ${inboundCurrencySymbol} at ${inboundCurrencyAddress}`);
    console.log(`Min Segment for Reward: ${minSegmentForReward}`);
    console.log(`Segment Length: ${segmentLength} seconds`);
    console.log(`Data Provider/Lending Pool Address: ${aaveContractAddress}`);
    
    console.log("\n\nConstructor Arguments ABI-Encoded:");
    console.log(encodedParameters.toString("hex"));
    console.log("\n\n\n\n");

}

module.exports = function (deployer, network, accounts) {
    // Injects network name into process .env variable to make accessible on test suite.
    process.env.NETWORK = network;

    // Skips migration for local tests and soliditycoverage
    if (["test", "soliditycoverage"].includes(network)) return;

    deployer.then(async () => {

        let networkName = getNetworkName(network);
        if (network === "local-celo-fork") {
            deployConfigs.selectedProvider = "moola";
            deployConfigs.inboundCurrencySymbol = "cusd";
        }
        const poolConfigs = providers[deployConfigs.selectedProvider.toLowerCase()][networkName];
        const lendingPoolAddressProvider = poolConfigs.lendingPoolAddressProvider;
        const inboundCurrencyAddress = poolConfigs[deployConfigs.inboundCurrencySymbol.toLowerCase()].address;
        const inboundCurrencyDecimals = poolConfigs[deployConfigs.inboundCurrencySymbol.toLowerCase()].decimals;

        let aaveContractAddress = poolConfigs.dataProvider;
        let streakBankContract = StreakBankContract;

        // Prepares deployment arguments
        const deploymentArgs = [
            streakBankContract,
            inboundCurrencyAddress,
            lendingPoolAddressProvider,
            deployConfigs.minSegmentForReward,
            deployConfigs.segmentLength,
            aaveContractAddress
        ];

        // Deploys StreakBank contract based on network
        await deployer.deploy(...deploymentArgs);
        
        // Prints deployment summary
        printSummary(
            {
                inboundCurrencyAddress,
                lendingPoolAddressProvider,
                minSegmentForReward: deployConfigs.minSegmentForReward,
                segmentLength: deployConfigs.segmentLength,
                aaveContractAddress,
            },
            {
                networkName,
                selectedProvider: deployConfigs.selectedProvider,
                inboundCurrencySymbol: deployConfigs.inboundCurrencySymbol,
                owner: accounts[0],
            }
        );
    });
};