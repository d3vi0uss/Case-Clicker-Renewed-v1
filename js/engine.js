let game = {
  money: 0,
  totalEarned: 0,
  xp: 0,
  level: 1,
  luck: 0,
  inventory: [],
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

function openCase() {
  if (game.money < 50) return alert("Not enough money!");
  game.money -= 50;
  game.casesOpened++;

  let roll = Math.random() * 100;
  let item;

  if (roll < 60) item = skins[0];
  else if (roll < 85) item = skins[1];
  else if (roll < 97) item = skins[2];
  else item = skins[3];

  let float = Math.random().toFixed(4);

  let newItem = {
    name: item.name,
    rarity: item.rarity,
    value: item.value,
    float: float
  };

  game.inventory.push(newItem);

  if (item.value > game.mostValuable)
    game.mostValuable = item.value;

  document.getElementById("caseResult").innerHTML =
    `<p>You pulled: <strong>${item.name}</strong> (${float})</p>`;

  updateUI();
  renderInventory();
  saveGame();
}

function renderInventory() {
  let grid = document.getElementById("inventoryGrid");
  grid.innerHTML = "";
  game.inventory.forEach(item => {
    let div = document.createElement("div");
    div.className = "itemCard " + item.rarity;
    div.innerHTML = `
      <strong>${item.name}</strong><br>
      Float: ${item.float}<br>
      $${item.value}
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
