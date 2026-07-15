function toggleVisibility(divName){
  let section = document.getElementById(divName);
  if(section != null){
    if(section.classList.contains("hidden")){
      section.classList.remove("hidden");
    } 
    else {
      section.classList.add("hidden");
    }
  }
}

function toggleFightVisibility(){
  toggleVisibility("fightDiv");
}

function toggleStatPanelVisibility(){
  toggleVisibility("statDiv");
}

const fightDiv = document.getElementById("fightDiv");
const fightDivToggleButton = document.getElementById("fightToggleButton");
fightDivToggleButton.addEventListener("click", toggleFightVisibility);
const statToggleButton = document.getElementById("statPanelToggleButton");
statToggleButton.addEventListener("click", toggleStatPanelVisibility);

// Stat panel elements
const playerName       = document.getElementById("player-name");
const statAttack       = document.getElementById("stat-attack");
const statDefence      = document.getElementById("stat-defence");
const statSpeed        = document.getElementById("stat-speed");
const statRegen        = document.getElementById("stat-regen");
const potAttack        = document.getElementById("pot-attack");
const potDefence       = document.getElementById("pot-defence");
const potSpeed         = document.getElementById("pot-speed");
const potRegen         = document.getElementById("pot-regen");
const healthText       = document.getElementById("health-text");

// Health bar in stat panel
const playerHealthBar      = document.getElementById("playerHealthBarInner");
const playerRegenSubBar    = document.getElementById("playerRegenSubBar");

// Combat view bars (mirrored)
const playerHealthBarCombat = document.getElementById("playerHealthBarCombat");
const playerAttackBar       = document.getElementById("playerAttackProgressBarInner");
const enemyHealthBar        = document.getElementById("enemyHealthBarInner");
const enemyAttackBar        = document.getElementById("enemyAttackProgressBarInner");
const enemyName             = document.getElementById("enemy-name");
const playerCombatName      = document.getElementById("player-combat-name");

let player;
let enemies;

// Fractional regen accumulator for the sub-bar
let regenAccumulator = 0;

function updateHealth(entity, healthBar, mirrorBar){
  let health_ratio = (entity.health / entity.maxHealth) * 100;
  let text = Math.floor(entity.health) + " / " + Math.floor(entity.maxHealth);
  healthBar.style.width = health_ratio + "%";
  healthBar.innerText = text;
  if(mirrorBar){
    mirrorBar.style.width = health_ratio + "%";
    mirrorBar.innerText = text;
  }
}

let ticksPassed = 0;
function updateStatPanel(){
  if(!player) return;
  ticksPassed += 1;
  let hp    = Math.floor(player.health);
  let maxHp = Math.floor(player.maxHealth);
  healthText.innerText = hp + " / " + maxHp;
  updateHealth(player, playerHealthBar, playerHealthBarCombat);

  statAttack.innerText  = player.attack.toFixed(1);
  statDefence.innerText = player.defence.toFixed(1);
  statSpeed.innerText   = player.attackSpeed.toFixed(2);
  statRegen.innerText   = player.healthRegenAmount.toFixed(3);
  // TODO: add debug mode that makes this info visible. could be an unlockable feature later
  // potAttack.innerText   = "/ " + player.potential.attack.toFixed(1);
  // potDefence.innerText  = "/ " + player.potential.defence.toFixed(1);
  // potSpeed.innerText    = "/ " + player.potential.attackSpeed.toFixed(2);
  // potRegen.innerText    = "/ " + player.potential.healthRegenAmount.toFixed(3);
}

function takeDamage(entity, attack, healthBar, mirrorBar) {
  let damageTaken = attack - entity.defence;
  if(damageTaken > 0){
    entity.health -= damageTaken;
    if(entity.health < 0) entity.health = 0;
    updateHealth(entity, healthBar, mirrorBar);
    return damageTaken;
  }
}

function calculateStatGrowth(current, potential, growthRate, modifier){
  let modifiers = growthRate * modifier;
  let gapFromPotential = potential - current;
  let growth = gapFromPotential * modifiers;
  if(growth < modifiers){
    if(growthRate * modifiers > gapFromPotential){
      growth = gapFromPotential;
    } 
    else {
      growth = modifiers;
    }
  }
  return growth;
}

function growStats(entity, modifier){
  entity.maxHealth      += calculateStatGrowth(entity.maxHealth, entity.potential.maxHealth, entity.growthRate, modifier);
  entity.attack         += calculateStatGrowth(entity.attack, entity.potential.attack, entity.growthRate, modifier);
  entity.attackSpeed    += calculateStatGrowth(entity.attackSpeed, entity.potential.attackSpeed, entity.growthRate, modifier);
  entity.defence        += calculateStatGrowth(entity.defence, entity.potential.defence, entity.growthRate, modifier);
  entity.healthRegenAmount += calculateStatGrowth(entity.healthRegenAmount, entity.potential.healthRegenAmount, entity.growthRate, modifier);
}

let regening    = false;
let regenTicks  = 0;
function stopRegen(){
  regening   = false;
  regenTicks = 0;
  regenAccumulator = 0;
  playerRegenSubBar.style.width = "0%";
}

function regen(rate){
  if(regening) regenRamp += 0.01;

  let healthPercentage  = player.health / player.maxHealth;
  let regeneratedAmount = player.healthRegenAmount * rate * healthPercentage * (1 + regenRamp);

  if(player.health < player.maxHealth){
    if(player.health + regeneratedAmount > player.maxHealth){
      regeneratedAmount = player.maxHealth - player.health;
      stopRegen();
    }
    player.health += regeneratedAmount;

    // Sub-bar: accumulate fractional progress toward next whole HP point
    if(Math.floor(player.health) >= Math.floor(player.maxHealth)){
      regenAccumulator = 0;
      playerRegenSubBar.style.width = "0%";
    }
    else{
      regenAccumulator += regeneratedAmount;
      let nextWhole = Math.ceil(player.health) - player.health;
      if(nextWhole <= 0) nextWhole = 1;
      let subPct = Math.min((regenAccumulator % 1) / nextWhole * 100, 100);
      playerRegenSubBar.style.width = subPct + "%";
      }
  
    updateStatPanel();
  } 
  else {
    regenRamp = 0;
    // Already full — make sure sub-bar is cleared
    regenAccumulator = 0;
    playerRegenSubBar.style.width = "0%";
  }

  player.potential.healthRegenAmount += (regeneratedAmount / 100000) * 1.05 ** (Math.floor(regenTicks / 200));

  if(healthPercentage >= 0.9 && rate >= 1){
    growStats(player, rate * 100);
  } else {
    growStats(player, (healthPercentage ** 2) * rate * 0.1);
  }
  regenTicks += 1;
}


let requiredAttackProgress;
let playerAttackProgress;
let enemyAttackProgress;

let fighting = false;
let enemy;

function fightTick(){
  console.log(player.potential.defence);
  regen(0.01);
  playerAttackProgress += player.attackSpeed;
  enemyAttackProgress  += enemy.attackSpeed;

  if(playerAttackProgress >= requiredAttackProgress){
    let damageTaken = takeDamage(enemy, player.attack, enemyHealthBar);
    if(damageTaken > 0){
      player.potential.attack += (enemy.health / damageTaken) / 10;
    }
    playerAttackProgress -= requiredAttackProgress;
  }

  if(enemyAttackProgress >= requiredAttackProgress){
    let damageTaken = takeDamage(player, enemy.attack, playerHealthBar, playerHealthBarCombat);
    if(damageTaken > 0){
      player.potential.defence    += (damageTaken / player.defence) / 5;
      if(enemy.attackSpeed > player.potential.attackSpeed){
        player.potential.attackSpeed += (enemy.attackSpeed - player.potential.attackSpeed) / 100;
      }
      player.potential.maxHealth  += (damageTaken * player.maxHealth / player.health) / 5;
      updateStatPanel();
    }
    enemyAttackProgress -= requiredAttackProgress;
  }

  playerAttackBar.style.width = (playerAttackProgress / requiredAttackProgress) * 100 + "%";
  enemyAttackBar.style.width  = (enemyAttackProgress  / requiredAttackProgress) * 100 + "%";

  if(player.health === 0 || enemy.health === 0){
    fighting = false;
    regening = true;
  }
}

const attackBtn = document.getElementById("attack-btn");

// mostly a placeholder in case other settings need to be loaded in
var gameIsSetup = false;
function gameStartSetup(){
  hidePotentialStats();
  gameIsSetup = true;
}


function gameLoop(){
  if(!gameIsSetup){
    gameStartSetup();
  }
  if(fighting){
    fightTick();
  } else if(player.health < player.maxHealth){
    regen(1);
  }
  // Keep stat panel fresh during regen between fights
  updateStatPanel();
}

function startFight(){
  requiredAttackProgress = player.attackSpeed * 10;
  enemy = loadEnemy();
  updateHealth(player, playerHealthBar, playerHealthBarCombat);
  updateHealth(enemy, enemyHealthBar);
  playerAttackProgress = 0;
  enemyAttackProgress  = 0;
  fighting  = true;
  regenRamp = 0;
  regenAccumulator = 0;
  playerRegenSubBar.style.width = "0%";
}

function hidePotentialStats(){
  var potentialStatSpans = document.querySelectorAll('.stat-potential');
  potentialStatSpans.forEach(statSpan => {
    statSpan.style.display = 'none';
  });
}

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const gitHubUrl   = 'https://raw.githubusercontent.com/CyberIgneel/wuxia-survival/test';

function loadJSON(relativePath){
  return fetch(relativePath)
    .then(response => {
      if(!response.ok) throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
      return response.json();
    })
    .catch(error => console.error(`Error loading JSON: ${error.message}`));
}

const SAVE_KEY = "wuxia_save";

function saveGame(){
  const saveData = { player, timestamp: Date.now() };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    console.log("Game saved.");
  } catch(e) {
    console.error("Save failed:", e);
  }
}

function loadSave(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  } catch(e) {
    console.error("Save corrupted, ignoring:", e);
    return null;
  }
}

function deleteSave(){
  localStorage.removeItem(SAVE_KEY);
}

async function loadWebsiteJSON(path){
  let url      = gitHubUrl + path;
  let response = await fetch(url);
  if(!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
  return await response.json();
}

function loadEnemy(){
  enemy = enemies.wolf;
  enemy.health = enemy.maxHealth;
  enemyName.innerText        = "Wolf";
  playerCombatName.innerText = player.name;
  return enemy;
}

(async () => {
  if(isLocalhost){
    enemies = await loadJSON("../data/defaults/enemies.json");
    player  = await loadJSON("../data/defaults/player_data.json");
  } else {
    enemies = await loadWebsiteJSON("/data/defaults/enemies.json");
    player  = await loadWebsiteJSON("/data/defaults/player_data.json");
  }

  const save = loadSave();
  if(save){
    player = save.player;
    console.log(`Save loaded from ${new Date(save.timestamp).toLocaleString()}`);
  }

  playerName.innerText = player.name;

  updateStatPanel(); // fixes the reload blank-bar bug
  setInterval(gameLoop,  100);
  setInterval(saveGame, 30000);
  attackBtn.addEventListener("click", startFight);
})();