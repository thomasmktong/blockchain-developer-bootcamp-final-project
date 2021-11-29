/* global context */
const IERC20 = artifacts.require("IERC20");
const ERC20Mintable = artifacts.require("MockERC20Mintable");
const StreakBank = artifacts.require("StreakBank");
const LendingPoolAddressesProviderMock = artifacts.require("LendingPoolAddressesProviderMock");
const { toWad } = require("@decentral.ee/web3-test-helpers");
const timeMachine = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

contract("StreakBank", (accounts) => {

  const BN = web3.utils.BN; // https://web3js.readthedocs.io/en/v1.2.7/web3-utils.html#bn
  const admin = accounts[0];
  let token;
  let aToken;
  let streakBank;
  let pap;
  let player1 = accounts[1];
  let player2 = accounts[2];
  const nonPlayer = accounts[9];

  const weekInSecs = 604800;
  const daiDecimals = web3.utils.toBN(1000000000000000000);
  const segmentPayment = daiDecimals.mul(new BN(10)); // equivalent to 10 DAI
  const minSegmentForReward = 3;
  const segmentLength = 604800;
  const ZERO_ADDRESS = null;

  beforeEach(async () => {
    global.web3 = web3;
    token = await ERC20Mintable.new("MINT", "MINT", { from: admin });
    // creates dai for player1 to hold.
    // Note DAI contract returns value to 18 Decimals
    // so token.balanceOf(address) should be converted with BN
    // and then divided by 10 ** 18
    await mintTokensFor(player1);
    await mintTokensFor(player2);
    pap = await LendingPoolAddressesProviderMock.new("TOKEN_NAME", "TOKEN_SYMBOL", { from: admin });
    aToken = await IERC20.at(await pap.getLendingPool.call());
    await pap.setUnderlyingAssetAddress(token.address);
    streakBank = await StreakBank.new(
      token.address,
      pap.address,
      minSegmentForReward,
      segmentLength,
      pap.address,
    );
  });

  async function mintTokensFor(player) {
    await token.mint(player, toWad(1000), { from: admin });
  }

  async function approveDaiToContract(fromAddr) {
    await token.approve(streakBank.address, segmentPayment, { from: fromAddr });
  }

  async function advanceUntilEligibleForReward() {
    // We need to to account for the first deposit window.
    // i.e., if game has 5 segments, we need to add + 1, because while current segment was 0,
    // it was just the first deposit window (a.k.a., joining period).
    await timeMachine.advanceTime(weekInSecs * (minSegmentForReward + 1));
  }

  async function joinGamePaySegmentsAndAdvanceTime(player, contractInstance) {
    let contract = contractInstance;
    if (!contract) {
      contract = streakBank;
    }
    await approveDaiToContract(player);
    await contract.joinGame(segmentPayment, { from: player });
    // The payment for the first segment was done upon joining, so we start counting from segment 2 (index 1)
    for (let index = 1; index < minSegmentForReward; index++) {
      await timeMachine.advanceTime(weekInSecs);
      await approveDaiToContract(player);
      await contract.makeDeposit({ from: player });
    }
    // above, it accounted for 1st deposit window, and then the loop runs till minSegmentForReward - 1.
    // now, we move 2 more segments (minSegmentForReward-1 and minSegmentForReward) to complete the game.
    await timeMachine.advanceTime(weekInSecs * 2);
  }

  describe("pre-flight checks", async () => {
    it("checks if DAI and aDAI contracts have distinct addresses", async () => {
      const daiAdd = token.address;
      const aDaiAdd = pap.address;
      assert(daiAdd !== aDaiAdd, `DAI ${daiAdd} and ADAI ${aDaiAdd} shouldn't be the same address`);
    });

    it("checks that contract starts holding 0 Dai and 0 aDai", async () => {
      const daiBalance = await token.balanceOf(streakBank.address);
      const aDaiBalance = await pap.balanceOf(streakBank.address);
      assert(
        daiBalance.toNumber() === 0,
        `On start, smart contract's DAI balance should be 0 DAI - got ${daiBalance.toNumber()} DAI`,
      );
      assert(
        aDaiBalance.toNumber() === 0,
        `on start, smart contract's aDAI balance should be 0 aDAI - got ${aDaiBalance.toNumber()} aDAI`,
      );
    });

    it("checks if player1 received minted DAI tokens", async () => {
      const usersDaiBalance = await token.balanceOf(player1);
      assert(usersDaiBalance.div(daiDecimals).gte(new BN(1000)), `Player1 balance should be greater than or equal to 100 DAI at start - current balance: ${usersDaiBalance}`);
    });
  });

  describe("when the contract is deployed", async () => {
    it("checks if the contract's variables were properly initialized", async () => {
      const inboundCurrencyResult = await streakBank.daiToken.call();
      const interestCurrencyResult = await streakBank.adaiToken.call();
      const lendingPoolAddressProviderResult = await streakBank.lendingPoolAddressProvider.call();
      const segmentLengthResult = await streakBank.segmentLength.call();
      assert(inboundCurrencyResult === token.address, `Inbound currency doesn't match. expected ${token.address}; got ${inboundCurrencyResult}`);
      assert(interestCurrencyResult === aToken.address, `Interest currency doesn't match. expected ${aToken.address}; got ${interestCurrencyResult}`);
      assert(lendingPoolAddressProviderResult === pap.address, `LendingPoolAddressesProvider doesn't match. expected ${pap.address}; got ${lendingPoolAddressProviderResult}`);
      assert(new BN(segmentLengthResult).eq(new BN(segmentLength)), `SegmentLength doesn't match. expected ${segmentLength}; got ${segmentLengthResult}`);
    });

    it("checks if game starts at segment zero", async () => {
      const expectedSegment = new BN(0);
      const result = await streakBank.getCurrentSegment.call({ from: admin });
      assert(
        result.eq(new BN(0)),
        `should start at segment ${expectedSegment} but started at ${result.toNumber()} instead.`,
      );
    });
  });

  describe("when the time passes for a game", async () => {
    it("checks if the game segments increase", async () => {
      let result = -1;
      for (let expectedSegment = 0; expectedSegment <= minSegmentForReward; expectedSegment++) {
        result = await streakBank.getCurrentSegment.call({ from: admin });
        assert(
          result.eq(new BN(expectedSegment)),
          `expected segment ${expectedSegment} actual ${result.toNumber()}`,
        );
        await timeMachine.advanceTimeAndBlock(weekInSecs);
      }
    });
  });

  describe("when an user tries to join a game", async () => {
    it("reverts if the contract is paused", async () => {
      await streakBank.pause({ from: admin });
      await truffleAssert.reverts(streakBank.joinGame(segmentPayment, { from: player1 }), "Pausable: paused");
    });

    // TODO: Fix later
    // it("reverts if user does not approve the contract to spend dai", async () => {
    //   await truffleAssert.reverts(streakBank.joinGame(segmentPayment, { from: player1 }), "You need to have allowance to do transfer DAI on the smart contract");
    // });

    it("reverts if the user tries to join the game twice", async () => {
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });
      await approveDaiToContract(player1);
      await truffleAssert.reverts(streakBank.joinGame(segmentPayment, { from: player1 }), "Cannot join the game while already in it");
    });

    it("increases activePlayersCount when a new player joins", async () => {
      const playerCountBefore = await streakBank.activePlayersCount.call();
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });
      const playerCountAfter = await streakBank.activePlayersCount.call();
      assert(playerCountAfter.eq(playerCountBefore.add(new BN(1))));
    });

    it("stores the player(s) who joined the game", async () => {
      // Player1 joins the game
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });

      await approveDaiToContract(player2);
      await streakBank.joinGame(segmentPayment, { from: player2 });

      // Checks player's info stored in the struct.
      const playerInfo1 = await streakBank.players(player1);
      assert(playerInfo1.mostRecentSegmentPaid.eq(new BN(0)));
      assert(playerInfo1.amountPaid.eq(segmentPayment));
      assert(playerInfo1.withdrawn === false);

      const playerInfo2 = await streakBank.players(player1);
      assert(playerInfo2.mostRecentSegmentPaid.eq(new BN(0)));
      assert(playerInfo2.amountPaid.eq(segmentPayment));
      assert(playerInfo2.withdrawn === false);
    });

    it("transfers the first payment to the contract", async () => {
      // Player1 joins the game
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });
      const contractsDaiBalance = await pap.balanceOf(streakBank.address);
      assert(contractsDaiBalance.eq(segmentPayment), "Contract balance should increase when user joins the game");
    });

    it("emits the event JoinedGame", async () => {
      await approveDaiToContract(player1);
      const result = await streakBank.joinGame(segmentPayment, { from: player1 });
      let playerEvent = "";
      let paymentEvent = 0;
      truffleAssert.eventEmitted(
        result,
        "JoinedGame",
        (ev) => {
          playerEvent = ev.player;
          paymentEvent = ev.amount;
          return playerEvent === player1 && new BN(paymentEvent).eq(new BN(segmentPayment));
        },
        `JoinedGame event should be emitted when an user joins the game with params\n
                player: expected ${player1}; got ${playerEvent}\n
                paymentAmount: expected ${segmentPayment}; got ${paymentEvent}`,
      );
    });
  });

  describe("when an user tries to make a deposit", async () => {
    it("reverts if the contract is paused", async () => {
      await streakBank.pause({ from: admin });
      await truffleAssert.reverts(streakBank.makeDeposit({ from: player1 }), "Pausable: paused");
    });

    it("reverts if user didn't join the game", async () => {
      await approveDaiToContract(player1);
      await truffleAssert.reverts(streakBank.makeDeposit({ from: player1 }), "Sender is not a player");
    });

    it("reverts if user is making a duplicated deposit for the same segment", async () => {
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });
      // Moves to the next segment
      await timeMachine.advanceTime(weekInSecs);
      await approveDaiToContract(player1);
      await streakBank.makeDeposit({ from: player1 });
      await approveDaiToContract(player1);
      await truffleAssert.reverts(streakBank.makeDeposit({ from: player1 }), "Player already paid current segment");
    });

    it("reverts if user forgot to deposit for previous segment", async () => {
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });
      await timeMachine.advanceTime(weekInSecs * 2);
      await approveDaiToContract(player1);
      await truffleAssert.reverts(streakBank.makeDeposit({ from: player1 }), "Player didn't pay the previous segment - game over!");
    });

    it("user can deposit successfully if all requirements are met", async () => {
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });
      await timeMachine.advanceTimeAndBlock(weekInSecs);
      await approveDaiToContract(player1);
      const result = await streakBank.makeDeposit({ from: player1 });
      truffleAssert.eventEmitted(
        result,
        "Deposit",
        (ev) => ev.player === player1,
        "player unable to deposit for segment 2 when all requirements were met",
      );
    });

    it("transfers the payment to the contract", async () => {
      const expectedBalance = web3.utils.toBN(segmentPayment * 2);
      await approveDaiToContract(player1);
      const playerAllowance = await token.allowance(player1, streakBank.address);
      assert(playerAllowance.gte(segmentPayment));
      await streakBank.joinGame(segmentPayment, { from: player1 });
      await timeMachine.advanceTimeAndBlock(weekInSecs);
      await approveDaiToContract(player1);
      await streakBank.makeDeposit({ from: player1 });
      const contractsDaiBalance = await pap.balanceOf(streakBank.address);
      assert(expectedBalance.eq(contractsDaiBalance), "Contract balance should increase when user deposits");
    });

    it("makes sure the total principal amount increases", async () => {
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });
      await timeMachine.advanceTimeAndBlock(weekInSecs);
      await approveDaiToContract(player1);
      const principalBeforeDeposit = await streakBank.totalGamePrincipal();
      await streakBank.makeDeposit({ from: player1 });
      const principalAfterDeposit = await streakBank.totalGamePrincipal();
      const difference = principalAfterDeposit.sub(principalBeforeDeposit);
      assert(difference.eq(segmentPayment));
    });

    it("makes sure the player info stored in contract is updated", async () => {
      await approveDaiToContract(player1);
      await streakBank.joinGame(segmentPayment, { from: player1 });
      await timeMachine.advanceTimeAndBlock(weekInSecs);
      await approveDaiToContract(player1);
      await streakBank.makeDeposit({ from: player1 });
      const playerInfo = await streakBank.players(player1);
      assert(playerInfo.mostRecentSegmentPaid.eq(new BN(1)));
      assert(playerInfo.amountPaid.eq(segmentPayment.mul(new BN(2))));
      assert(playerInfo.withdrawn === false);
    });
  });

  describe("when an user tries to withdraw", async () => {
    it("reverts if user tries to withdraw more than once", async () => {
      await joinGamePaySegmentsAndAdvanceTime(player1);
      await streakBank.withdraw({ from: player1 });
      await truffleAssert.reverts(streakBank.withdraw({ from: player1 }), "Player has already withdrawn");
    });

    it("reverts if a non-player tries to withdraw", async () => {
      await joinGamePaySegmentsAndAdvanceTime(player1);
      await truffleAssert.reverts(streakBank.withdraw({ from: nonPlayer }), "Player does not exist");
    });

    it("sets withdrawn flag to true after user withdraws", async () => {
      await joinGamePaySegmentsAndAdvanceTime(player1);
      await streakBank.withdraw({ from: player1 });
      const player1Result = await streakBank.players.call(player1);
      assert(player1Result.withdrawn);
    });

    it("emits Withdrawal event when user withdraws", async () => {
      await joinGamePaySegmentsAndAdvanceTime(player1);
      const result = await streakBank.withdraw({ from: player1 });
      truffleAssert.eventEmitted(result, "Withdrawal", (ev) => {
        return (
          ev.player === player1 &&
          new BN(ev.playerReward).eq(new BN(0)) &&
          new BN(ev.playerIncentive).eq(new BN(0))
        );
      }, "unable to withdraw amount");
    });

  });

  describe("as a Pausable contract", async () => {
    describe("checks Pausable access control", async () => {
      it("does not revert when admin invokes pause()", async () => {
        truffleAssert.passes(streakBank.pause({ from: admin }), "Ownable: caller is owner but failed to pause the contract");
      });

      it("does not revert when admin invokes unpause()", async () => {
        await streakBank.pause({ from: admin });
        truffleAssert.passes(streakBank.unpause({ from: admin }), "Ownable: caller is owner but failed to unpause the contract");
      });

      it("reverts when non-admin invokes pause()", async () => {
        await truffleAssert.reverts(streakBank.pause({ from: player1 }), "Ownable: caller is not the owner");
      });

      it("reverts when non-admin invokes unpause()", async () => {
        await streakBank.pause({ from: admin });
        await truffleAssert.reverts(streakBank.unpause({ from: player1 }), "Ownable: caller is not the owner");
      });
    });

    describe("checks Pausable contract default behavior", () => {
      beforeEach(async function () {
        await streakBank.pause({ from: admin });
      });

      describe("checks Pausable contract default behavior", () => {
        it("pauses the contract", async () => {
          const result = await streakBank.paused.call({ from: admin });
          assert(result, "contract is not paused");
        });

        it("unpauses the contract", async () => {
          await streakBank.unpause({ from: admin });
          const result = await streakBank.pause.call({ from: admin });
          assert(result, "contract is paused");
        });
      });
    });
  });

  // TODO: Fix later
  // describe("as a Ownable Contract", async () => {
  //   it("reverts when admins tries to renounceOwnership without unlocking it first", async () => {
  //     await truffleAssert.reverts(streakBank.renounceOwnership({ from: admin }), "Not allowed");
  //   });

  //   it("allows admin to renounceOwnership after unlocking it first", async () => {
  //     await streakBank.unlockRenounceOwnership({ from: admin });
  //     const currentOwner = await streakBank.owner({ from: admin });
  //     assert(currentOwner, admin);
  //     truffleAssert.passes(streakBank.renounceOwnership({ from: admin }), "Unexpected Error");
  //     const newOwner = await streakBank.owner({ from: admin });
  //     assert(newOwner, ZERO_ADDRESS);
  //   });
  // });

});