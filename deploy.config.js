/**
 * Deployment configs for supported lending providers and networks
 *
 * Aave
 * Addresses available at https://docs.aave.com/developers/deployed-contracts (v2) & https://docs.aave.com/developers/deployed-contracts/deployed-contract-instances (v1)
 *
*/

exports.providers = {
    aave: {
        kovan: {
            lendingPoolAddressProvider: "0x88757f2f99175387ab4c6a4b3067c77a695b0349",
            dataProvider: "0x3c73a5e5785cac854d468f727c606c07488a29d6",
            dai: {
                address: "0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD",
                decimals: 18,
            },
            incentiveToken: "0x0000000000000000000000000000000000000000",
        },
        polygon: {
            lendingPoolAddressProvider: "0xd05e3E715d945B59290df0ae8eF85c1BdB684744",
            dataProvider: "0x7551b5D2763519d4e37e8B81929D336De671d46d",
            incentiveController: "0x357D51124f59836DeD84c8a1730D72B749d8BC23",
            wmatic: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
            dai: {
                address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
                decimals: 18,
            },
            weth: {
                address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
                decimals: 18,
            },
            incentiveToken: "0x0000000000000000000000000000000000000000",
        },
        alfajores: {
            lendingPoolAddressProvider: "0xb3072f5F0d5e8B9036aEC29F37baB70E86EA0018",
            dataProvider: "0x31ccB9dC068058672D96E92BAf96B1607855822E",
            dai: {
                address: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
                decimals: 18,
            },
            incentiveToken: "0x0000000000000000000000000000000000000000",
        },
        ropsten: {
            lendingPoolAddressProvider: "0x1c8756FD2B28e9426CDBDcC7E3c4d64fa9A54728",   /* Note: Ropsten depreciated in Aave v2 */
            dai: {                                                                      /* Note: Ropsten depreciated in Aave v2 */
                address: "0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108",                  /* Note: Ropsten depreciated in Aave v2 */
                decimals: 18,
            },
            incentiveToken: "0x0000000000000000000000000000000000000000",
        },
        mainnet: {
            lendingPoolAddressProvider: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
            dataProvider: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d",
            dai: {
                address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
                decimals: 18,
            },
            incentiveToken: "0x0000000000000000000000000000000000000000",
        },
    },
    moola: {
        celo: {
            lendingPoolAddressProvider: "0xD1088091A174d33412a968Fa34Cb67131188B332",
            dataProvider: "0x43d067ed784D9DD2ffEda73775e2CC4c560103A1",
            dai: {
                address: "0xE4fE50cdD716522A56204352f00AA110F731932d",
                decimals: 18,
            },
            cusd: {
                address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
                decimals: 18,
            },
            incentiveToken: "0x0000000000000000000000000000000000000000",
            // incentiveToken: "0x471EcE3750Da237f93B8E339c536989b8978a438", // CELO
        },
    }
};

exports.deployConfigs = {
    selectedProvider: "aave", // name of the selected provider. Must be defined in the object {providers} above.
    inboundCurrencySymbol: "dai", // name of the inbound currency symbol. Must be defined in the object {providers.network} above.
    segmentLength: 604800, // in seconds
    minSegmentForReward: 3, // integer number of segments players have to stay in game for the interest (input 3 if players can withdraw after 4th deposit).
};