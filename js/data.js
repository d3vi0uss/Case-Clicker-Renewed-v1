const rarities = {
  common: { chance: 60, color: "gray", multiplier: 1 },
  rare: { chance: 25, color: "blue", multiplier: 1.5 },
  epic: { chance: 10, color: "purple", multiplier: 3 },
  legendary: { chance: 4, color: "gold", multiplier: 6 },
  knife: { chance: 1, color: "orange", multiplier: 15 }
};

const cases = [
  {
    name: "Starter Case",
    price: 50,
    skins: [
      { name: "AK-47 | Rusted Fury", rarity: "common", base: 10 },
      { name: "M4A1-S | Night Ops", rarity: "rare", base: 40 },
      { name: "AWP | Crimson Storm", rarity: "epic", base: 150 },
      { name: "Desert Eagle | Inferno", rarity: "legendary", base: 400 },
      { name: "Karambit | Golden Blaze", rarity: "knife", base: 2000 }
    ]
  },
  {
    name: "Elite Case",
    price: 150,
    skins: [
      { name: "AK-47 | Emerald Strike", rarity: "rare", base: 120 },
      { name: "M4A4 | Cyber Storm", rarity: "epic", base: 300 },
      { name: "AWP | Dragon Pulse", rarity: "legendary", base: 800 },
      { name: "Butterfly Knife | Neon Fade", rarity: "knife", base: 3500 }
    ]
  }
];
