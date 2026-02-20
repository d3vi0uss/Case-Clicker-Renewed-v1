let game = {
  money: 0,
  totalEarned: 0,
  xp: 0,
  level: 1,
  luck: 0,
  inventory: [],
  marketListings: [],
  marketDemand: {},
  casesOpened: 0,
  mostValuable: 0,
  username: ""
};

function saveGame() {
  localStorage.setItem("ccrSave", JSON.stringify(game));
}

function loadGame() {
  let save = localStorage.getItem("ccrSave");
  if (save) {
    game = JSON.parse(save);
  }
  updateUI();
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
  document.getElementById(page + "Page").classList.remove("hidden");

  if (page === "casino") {
  updateBJMoney();
}

  if (page === "market") {
  renderMarket();
}
}

function clickMoney() {
  let amount = 1 + game.level;
  game.money += amount;
  game.totalEarned += amount;
  game.xp += 5;
  levelCheck();
  updateUI();
  saveGame();
}

function levelCheck() {
  let required = game.level * 100;
  if (game.xp >= required) {
    game.xp = 0;
    game.level++;
    game.luck += 1;
  }
}

function openCase(caseIndex = 0) {
  const selectedCase = cases[caseIndex];

  if (game.money < selectedCase.price)
    return alert("Not enough money!");

  game.money -= selectedCase.price;
  game.casesOpened++;

  const roll = Math.random() * 100;
  let cumulative = 0;
  let chosenRarity;

  for (let rarity in rarities) {
    cumulative += rarities[rarity].chance + game.luck * 0.05;
    if (roll <= cumulative) {
      chosenRarity = rarity;
      break;
    }
  }

  const possibleSkins = selectedCase.skins.filter(
    s => s.rarity === chosenRarity
  );

  const skin =
    possibleSkins[Math.floor(Math.random() * possibleSkins.length)];

  const float = Math.random();
  let wear;

  if (float < 0.07) wear = "Factory New";
  else if (float < 0.15) wear = "Minimal Wear";
  else if (float < 0.38) wear = "Field-Tested";
  else if (float < 0.45) wear = "Well-Worn";
  else wear = "Battle-Scarred";

  const statTrak = Math.random() < 0.1;

  const value =
    Math.floor(
      skin.base *
        rarities[skin.rarity].multiplier *
        (1 + (1 - float))
    ) + (statTrak ? 50 : 0);

  const newItem = {
    name: skin.name,
    rarity: skin.rarity,
    float: float.toFixed(4),
    wear,
    statTrak,
    value
  };

  game.inventory.push(newItem);

  if (value > game.mostValuable)
    game.mostValuable = value;

  document.getElementById("caseResult").innerHTML = `
    <div class="${skin.rarity}">
      <h3>${statTrak ? "StatTrak™ " : ""}${skin.name}</h3>
      <p>${wear} (${float.toFixed(4)})</p>
      <p>Value: $${value}</p>
    </div>
  `;

  updateUI();
  renderInventory();
  saveGame();
}

function renderInventory() {
  let grid = document.getElementById("inventoryGrid");
  grid.innerHTML = "";

  game.inventory.forEach((item, index) => {
    let div = document.createElement("div");
    div.className = "itemCard " + item.rarity;

    div.innerHTML = `
      <strong>${item.statTrak ? "StatTrak™ " : ""}${item.name}</strong><br>
      ${item.wear}<br>
      Float: ${item.float}<br>
      Value: $${item.value}<br>
      <button onclick="sellItem(${index})">Sell</button>
    `;

    grid.appendChild(div);
  });
}

function updateUI() {
  document.getElementById("moneyDisplay").innerText = "$" + game.money;
  document.getElementById("levelDisplay").innerText = game.level;
  document.getElementById("xpDisplay").innerText = game.xp;
  document.getElementById("luckDisplay").innerText = game.luck + "%";
  document.getElementById("totalEarned").innerText = "$" + game.totalEarned;
  document.getElementById("casesOpened").innerText = game.casesOpened;
  document.getElementById("mostValuable").innerText = "$" + game.mostValuable;
}

loadGame();
renderInventory();
renderCases();
renderMarket();

function sellItem(index) {
  const item = game.inventory[index];

  const sellPrice = Math.floor(item.value * (0.9 + Math.random() * 0.2));

  game.marketListings.push({
    name: item.name,
    rarity: item.rarity,
    price: sellPrice,
    seller: "player"
  });

  game.inventory.splice(index, 1);

  renderInventory();
  renderMarket();
  saveGame();
}

function renderCases() {
  const container = document.getElementById("caseList");
  container.innerHTML = "";

  cases.forEach((c, index) => {
    const div = document.createElement("div");
    div.className = "itemCard";

    div.innerHTML = `
      <strong>${c.name}</strong><br>
      Price: $${c.price}<br>
      <button onclick="openCase(${index})">Open</button>
    `;

    container.appendChild(div);
  });
}

// ---------- BLACKJACK SYSTEM ----------

let bjGame = {
  active: false,
  bet: 0,
  player: [],
  dealer: []
};

function updateBJMoney() {
  document.getElementById("bjMoney").innerText = "$" + game.money;
}

function drawCard() {
  const card = Math.floor(Math.random() * 13) + 1;
  return card > 10 ? 10 : card;
}

function calculateHand(hand) {
  let total = 0;
  let aces = 0;

  hand.forEach(card => {
    if (card === 1) {
      aces++;
      total += 11;
    } else {
      total += card;
    }
  });

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function startBlackjack() {
  const betInput = document.getElementById("bjBet").value;
  const bet = parseInt(betInput);

  if (!bet || bet <= 0) return alert("Enter valid bet");
  if (bet > game.money) return alert("Not enough money");

  game.money -= bet;
  bjGame.bet = bet;
  bjGame.player = [drawCard(), drawCard()];
  bjGame.dealer = [drawCard(), drawCard()];
  bjGame.active = true;

  updateBJDisplay();
  updateUI();
  updateBJMoney();
  saveGame();
}

function hit() {
  if (!bjGame.active) return;

  bjGame.player.push(drawCard());

  if (calculateHand(bjGame.player) > 21) {
    endBlackjack("Bust! You lose.");
  }

  updateBJDisplay();
}

function stand() {
  if (!bjGame.active) return;

  while (calculateHand(bjGame.dealer) < 17) {
    bjGame.dealer.push(drawCard());
  }

  const playerTotal = calculateHand(bjGame.player);
  const dealerTotal = calculateHand(bjGame.dealer);

  if (dealerTotal > 21 || playerTotal > dealerTotal) {
    game.money += bjGame.bet * 2;
    endBlackjack("You win!");
  } else if (playerTotal === dealerTotal) {
    game.money += bjGame.bet;
    endBlackjack("Push.");
  } else {
    endBlackjack("Dealer wins.");
  }

  updateUI();
  updateBJMoney();
  saveGame();
}

function endBlackjack(message) {
  bjGame.active = false;
  document.getElementById("bjResult").innerText = message;
}

function updateBJDisplay() {
  document.getElementById("playerHand").innerText =
    bjGame.player.join(", ") + " (" + calculateHand(bjGame.player) + ")";

  document.getElementById("dealerHand").innerText =
    bjGame.dealer.join(", ") + " (" + calculateHand(bjGame.dealer) + ")";
}

// ---------- MARKET SYSTEM ----------

function generateBotListings() {
  game.marketListings = [];

  for (let i = 0; i < 10; i++) {
    const randomCase = cases[Math.floor(Math.random() * cases.length)];
    const randomSkin =
      randomCase.skins[Math.floor(Math.random() * randomCase.skins.length)];

    const fluctuation = 0.8 + Math.random() * 0.4;

    const duplicates = game.marketListings.filter(
  i => i.name === randomSkin.name
).length;

const supplyFactor = 1 - duplicates * 0.05;

const price = Math.floor(randomSkin.base * fluctuation * supplyFactor);

    game.marketListings.push({
      name: randomSkin.name,
      rarity: randomSkin.rarity,
      price: price
    });
  }

  renderMarket();
  saveGame();
}

function renderMarket() {
  const container = document.getElementById("marketListings");
  container.innerHTML = "";

  game.marketListings.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "itemCard " + item.rarity;

    div.innerHTML = `
      <strong>${item.name}</strong><br>
      Price: $${item.price}<br>
      <button onclick="buyItem(${index})">Buy</button>
    `;

    container.appendChild(div);
  });
}

function buyItem(index) {
  const item = game.marketListings[index];

  if (!game.marketDemand[item.name]) {
  game.marketDemand[item.name] = 0;
}

game.marketDemand[item.name] += 1;

  if (game.money < item.price)
    return alert("Not enough money!");

  game.money -= item.price;

  if (item.seller === "player") {
    game.money += item.price; 
  } else {
    game.inventory.push({
      name: item.name,
      rarity: item.rarity,
      float: (Math.random()).toFixed(4),
      wear: "Market Purchased",
      statTrak: false,
      value: item.price
    });
  }

  game.marketListings.splice(index, 1);

  updateUI();
  renderInventory();
  renderMarket();
  saveGame();
}

// ---------- LIVE MARKET ENGINE ----------

function marketTick() {
  if (game.marketListings.length === 0) return;

  const randomIndex = Math.floor(Math.random() * game.marketListings.length);
  const item = game.marketListings[randomIndex];

  const demand = game.marketDemand[item.name] || 0;

  const buyChance = 0.2 + demand * 0.05;

  if (Math.random() < buyChance) {

    if (item.seller === "player") {
      game.money += item.price;
    }

    game.marketListings.splice(randomIndex, 1);

    renderMarket();
    updateUI();
    saveGame();
  }
}

setInterval(marketTick, 5000);
