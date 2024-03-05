function toggleVisilibity(divName){
  let section = document.getElementById(divName);
  if(section != null){
    if(section.classList.contains("hidden")){
      section.classList.remove("hidden");
    }
    else{
      section.classList.add("hidden");
    }
  }
}

function toggleFightVisilibity(){
  toggleVisilibity("fightDiv");
}

const fightDiv = document.getElementById("fightDiv");
const fightDivToggleButton = document.getElementById("fightToggleButton");
fightDivToggleButton.addEventListener("click", toggleFightVisilibity);

const playerHealthBar = document.getElementById("playerHealthBarInner"); 
const playerAttackBar = document.getElementById("playerAttackProgressBarInner")
const playerName = document.getElementById("player-name");
let player;

const enemyHealthBar = document.getElementById("enemyHealthBarInner");
const enemyName = document.getElementById("enemy-name");
const enemyAttackBar = document.getElementById("enemyAttackProgressBarInner");
let enemies;

function updateHealth(entity, healthBar){
  let displayHealth = entity.health.toFixed(0);
  let displayMaxHealth = entity.maxHealth.toFixed(0);
  healthBar.style.width = (displayHealth/displayMaxHealth)*100+"%";
  healthBar.innerText = displayHealth + "/" + displayMaxHealth;
}

function takeDamage(entity, attack, healthBar) {
  let damageTaken = attack - entity.defence ;
  entity.health -= damageTaken;
  if (entity.health < 0){
    entity.health = 0;
  }
  updateHealth(entity, healthBar)
  return damageTaken;
}

function calculateStatGrowth(current, potential, growthRate, modifier){
  let modifiers = growthRate*modifier;
  let gapFromPotential = potential-current
  let growth = gapFromPotential*modifiers;
  // preventing too small an increment leading to eternal asymptotic growth
  if(growth < modifiers){
    // preventing overflowing past potential
    if(growthRate*modifiers > gapFromPotential){
      growth = gapFromPotential;
    }
    // minimum growth rate
    else{
      growth = modifiers;
    }
  }
  return growth;
}

// maybe eventually transition to limits set by culitvation level, and slightly surpassing those (increasing overall potential) through "hard work"
function growStats(entity, modifier){
  entity.maxHealth += calculateStatGrowth(entity.maxHealth, entity.potential.maxHealth, entity.growthRate, modifier);
  entity.attack += calculateStatGrowth(entity.attack, entity.potential.attack, entity.growthRate, modifier);
  entity.attackSpeed += calculateStatGrowth(entity.attackSpeed, entity.potential.attackSpeed, entity.growthRate, modifier);
  entity.defence += calculateStatGrowth(entity.defence, entity.potential.defence, entity.growthRate, modifier);
  entity.healthRegenAmount += calculateStatGrowth(entity.healthRegenAmount, entity.potential.healthRegenAmount, entity.growthRate, modifier);
}


let regening = false;
let regenTicks = 0;
function stopRegen(){
  regening = false;
  regenTicks = 0;
}

function regen(rate){
  let healthPercentage = player.health/player.maxHealth
  let regeneratedAmount = player.healthRegenAmount*rate*healthPercentage;
  if(player.health < player.maxHealth){
    if(player.health + regeneratedAmount > player.maxHealth){
      regeneratedAmount = player.maxHealth - player.health;
      stopRegen();
    }
    player.health += regeneratedAmount;
    updateHealth(player, playerHealthBar);
  }
  player.potential.healthRegenAmount += (regeneratedAmount/100000) *1.05**(Math.floor(regenTicks/200));
  if (healthPercentage >= 0.9 && rate >= 1){
    growStats(player, rate*100);
  }
  else{
    growStats(player, (healthPercentage**2)*rate*0.1);
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
  enemyAttackProgress += enemy.attackSpeed;
  if(playerAttackProgress >= requiredAttackProgress){
    let damageTaken = takeDamage(enemy, player.attack, enemyHealthBar);
    player.potential.attack += (enemy.health/damageTaken)/10;
    playerAttackProgress -= requiredAttackProgress;
  }

  if(enemyAttackProgress >= requiredAttackProgress){
    let damageTaken = takeDamage(player, enemy.attack, playerHealthBar);
    if (damageTaken > 0){
      player.potential.defence += (damageTaken/player.defence)/5;
      if(enemy.attackSpeed > player.potential.attackSpeed){
        player.potential.attackSpeed += (enemy.attackSpeed-player.potential.attackSpeed)/100;
      }
      player.potential.maxHealth += (damageTaken * player.maxHealth/player.health)/5;
    }
    enemyAttackProgress -= requiredAttackProgress;
  }
  

  playerAttackBar.style.width = (playerAttackProgress/requiredAttackProgress)*100+"%";
  enemyAttackBar.style.width = (enemyAttackProgress/requiredAttackProgress)*100+"%";
  
  if(player.health == 0 || enemy.health == 0){
    fighting = false;
    regening = true;
  } 
}


const attackBtn = document.getElementById("attack-btn");
const runBtn = document.getElementById("run-btn");


function gameLoop(){
  if(fighting){
    fightTick();
  }
  else if (regening){
    regen(1);
  }
  else{
    growStats(player, 1);
  }
}

function startFight(){
  requiredAttackProgress = player.attackSpeed * 10;
  enemy = loadEnemy();
  updateHealth(player, playerHealthBar);
  updateHealth(enemy, enemyHealthBar);
  playerAttackProgress = 0;
  enemyAttackProgress = 0;
  fighting = true;
}

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const gitHubUrl = 'https://raw.githubusercontent.com/CyberIgneel/wuxia-survival/test';

function loadJSON(relativePath) {
  return fetch(relativePath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error(`Error loading JSON: ${error.message}`);
    });
}

async function loadWebsiteJSON(path){
  url = gitHubUrl + path;
  response = await fetch(url);
  if (!response.ok){
    throw new Error(`Network response was not ok: ${response.statusText}`);
  }
  return await response.json();
}


function loadEnemy(){
  enemy = enemies.wolf;
  enemy.health = enemy.maxHealth;
  enemyName.innerText = "wolf";
  return enemy;
}


(async() => {
  if (isLocalhost){
    enemies = await loadJSON("../data/defaults/enemies.json");
    player = await loadJSON("../data/defaults/player_data.json");
  }
  else{
    enemies = await loadWebsiteJSON("/data/defaults/enemies.json");
    player = await loadWebsiteJSON("/data/defaults/player_data.json");
  }
  playerName.innerText = player.name;
  setInterval(gameLoop, 100);
  attackBtn.addEventListener("click", startFight);
})()