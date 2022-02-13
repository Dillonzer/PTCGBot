import fetch from "node-fetch";
import tmi from 'tmi.js'
import dotenv from 'dotenv'

dotenv.config();

function Card(name, set, number, cardText, hp, weakness, resistance, retreatCost, type)
{
    this.Name = name;
    this.Set = set;
    this.Number = number;
    this.CardText = cardText;
    this.Hp = hp,
    this.Weakness = weakness,
    this.Resistance = resistance,
    this.RetreatCost = retreatCost,
    this.Type = type
}

function CommandCooldown(channel, command, time)
{
    this.Channel = channel,
    this.Command = command,
    this.Time = time
}

var allCards = []
var commandCooldowns = []
var channels = [
    'Dillonzer',
    'TrickyGym',
    'linty_rosecup',
    'Azulgg',
    'RamboFW',
    'neutronptcg'
  ]

const opts = {
  identity: {
    username: process.env.BOT_NAME,
    password: process.env.OAUTH_TOKEN
  },
  channels: channels
};

getAllCards()
populateCooldowns()

const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

function commandSwitcher(msg, channel)
{
    const command = msg.split(' ');

    if (msg === '!card')
    {
        return;
    }

    if(command[0] === '!cardhelp' || command[0] === '!setcodes')
    {      
        helpInfo(channel)
        return
    }


    if (command[0] === '!card') 
    {
        cardCommand(msg, channel)
    }

    if(command[0] === '!cardnum')
    {
        cardNumCommand(msg, channel)
    }
}

// #region Bot Function
function onMessageHandler (channel, context, msg, self) 
{
    if (self) { return; } // Ignore messages from the bot
    
    if(!onCooldown(channel))
    {
        setCooldown(channel)
        commandSwitcher(msg, channel)
        console.log(`* Executed ${msg} on ${channel}`);
    }

   
}

function onConnectedHandler (addr, port) 
{
  console.log(`* Connected to ${addr}:${port}`);
}

function getAllCards()
{
    var apiCall = process.env.API_URL+"/api/cards";
    fetch(apiCall).then(response => {
    return response.json();
    }).then(data => {
        for(var index in data) {
            allCards.push(new Card(data[index].name, data[index].set.ptcgoCode, data[index].number, data[index].cardText, data[index].hp, data[index].weakness, data[index].resistance, data[index].retreatCost, data[index].type));
        }  
        console.log("All Cards Loaded")
        
    }).catch(err => {
        console.log(err)
    });
}
// #endregion

// #region Commands
function cardCommand(msg, channel)
{
    var cardDetails = msg.replace('!card', '')
    var setSplit  = cardDetails.split(' ')
    if(setSplit.length < 3)
    {
        client.say(channel, "Please use the command as !card setAbbr cardName")
        return
    }
    var set = setSplit[1]
    var cardName = cardDetails.substring(nthIndex(cardDetails, ' ', 2))
    var cardAttack = getCardAttack(set, cardName);
    client.say(channel, cardAttack);
}

function cardNumCommand(msg, channel)
{
    var cardDetails = msg.replace('!cardnum', '')
    var setSplit  = cardDetails.split(' ')
    if(setSplit.length < 4)
    {
        client.say(channel, "Please use the command as !cardnum setAbbr num cardName")
        return
    }
    var set = setSplit[1]
    var num = setSplit[2]
    var cardName = cardDetails.substring(nthIndex(cardDetails, ' ', 3))
    var cardAttack = getCardAttackWithNumber(set, cardName, num);
    client.say(channel, cardAttack);
}

function helpInfo(channel)
{    
    client.say(channel, "All the info you need is here: https://dillonzer.github.io/ptcgBot.html")
}
// #endregion

// #region Command Helpers
function getCardAttack (set, cardName) 
{
    var filterCount = allCards.filter(x => x.Set.toLowerCase() === set.toLowerCase() && x.Name.toLowerCase() === cardName.trim().toLowerCase())
    if(filterCount.length > 0)
    {        
        if(filterCount.length > 1)
        {
            var filterText = filterCount[0].CardText
            var checkAttacks = filterCount.filter(x => x.CardText.toLowerCase() === filterText.toLowerCase())

            if(checkAttacks.length > 1)
            {
                var card = filterCount.find(x => x.Set.toLowerCase() === set.toLowerCase() && x.Name.toLowerCase() === cardName.trim().toLowerCase())
                if(card != undefined || card != null)
                {
                    var cardType = card.Type
                    cardType = cardType.replace("Fire","[R]")
                    cardType = cardType.replace("Fairy","[Y]")
                    cardType = cardType.replace("Fighting","[F]")
                    cardType = cardType.replace("Water","[W]")
                    cardType = cardType.replace("Colorless","[C]")
                    cardType = cardType.replace("Lightning","[L]")
                    cardType = cardType.replace("Grass","[G]")
                    cardType = cardType.replace("Psychic","[P]")
                    cardType = cardType.replace("Darkness","[D]")
                    cardType = cardType.replace("Metal","[M]")

                    if(card.Hp == null)
                    {
                        return `${cardType} | ${card.Name} | ${card.CardText}`
                    }
                    else
                    {
                        var weakness = "None"
                        var resistance = "None"
                        var retreatCost = "0"

                        if(card.Weakness != null)
                        {
                            weakness = card.Weakness
                        }
                        if(card.Resistance != null)
                        {
                            resistance = card.Resistance
                        }
                        if(card.RetreatCost != null)
                        {
                            retreatCost = card.RetreatCost
                        }

                        return `${cardType} | ${card.Name} (${card.Hp} HP) | ${card.CardText} | Weakness: ${weakness} | Resistance: ${resistance} | Retreat Cost: ${retreatCost}`
                    }
                }
                else
                {
                    return "Unexpected Error"
                }
            }
            else
            {
                var returnString = `There are ${filterCount.length} versions of this card in this set. Please use one of the following commands below to view the card you want:\n`
                for(var i in filterCount)
                {
                    returnString += `< !cardnum ${filterCount[i].Set} ${filterCount[i].Number} ${filterCount[i].Name} >\n`
                }
                return returnString
            }
        }
        else
        {
            var card = allCards.find(x => x.Set.toLowerCase() === set.toLowerCase() && x.Name.toLowerCase() === cardName.trim().toLowerCase())
            if(card != undefined || card != null)
            {
                var cardType = card.Type
                cardType = cardType.replace("Fire","[R]")
                cardType = cardType.replace("Fairy","[Y]")
                cardType = cardType.replace("Fighting","[F]")
                cardType = cardType.replace("Water","[W]")
                cardType = cardType.replace("Colorless","[C]")
                cardType = cardType.replace("Lightning","[L]")
                cardType = cardType.replace("Grass","[G]")
                cardType = cardType.replace("Psychic","[P]")
                cardType = cardType.replace("Darkness","[D]")
                cardType = cardType.replace("Metal","[M]")

                if(card.Hp == null)
                {
                    return `${cardType} | ${card.Name} | ${card.CardText}`
                }
                else
                {
                    var weakness = "None"
                    var resistance = "None"
                    var retreatCost = "0"

                    if(card.Weakness != null)
                    {
                        weakness = card.Weakness
                    }
                    if(card.Resistance != null)
                    {
                        resistance = card.Resistance
                    }
                    if(card.RetreatCost != null)
                    {
                        retreatCost = card.RetreatCost
                    }

                    return `${cardType} | ${card.Name} (${card.Hp} HP) | ${card.CardText} | Weakness: ${weakness} | Resistance: ${resistance} | Retreat Cost: ${retreatCost}`
                }
            }
            else
            {
                return "Unexpected Error"
            }
        }
        
    }
    else
    {
        return `Could not find ${set} ${cardName}`
    }
}

function getCardAttackWithNumber(set, cardName, number)
{
    var filterCount = allCards.filter(x => x.Set.toLowerCase() === set.toLowerCase() && x.Name.toLowerCase() === cardName.trim().toLowerCase() && x.Number.toLowerCase() == number.toLowerCase())
    if(filterCount.length > 0)
    {   
        var card = filterCount.find(x => x.Set.toLowerCase() === set.toLowerCase() && x.Name.toLowerCase() === cardName.trim().toLowerCase() && x.Number.toLowerCase() == number.toLowerCase())
        if(card != undefined || card != null)
        {
            var cardType = card.Type
            cardType = cardType.replace("Fire","[R]")
            cardType = cardType.replace("Fairy","[Y]")
            cardType = cardType.replace("Fighting","[F]")
            cardType = cardType.replace("Water","[W]")
            cardType = cardType.replace("Colorless","[C]")
            cardType = cardType.replace("Lightning","[L]")
            cardType = cardType.replace("Grass","[G]")
            cardType = cardType.replace("Psychic","[P]")
            cardType = cardType.replace("Darkness","[D]")
            cardType = cardType.replace("Metal","[M]")

            if(card.Hp == null)
            {
                return `${cardType} | ${card.Name} | ${card.CardText}`
            }
            else
            {
                var weakness = "None"
                var resistance = "None"
                var retreatCost = "0"

                if(card.Weakness != null)
                {
                    weakness = card.Weakness
                }
                if(card.Resistance != null)
                {
                    resistance = card.Resistance
                }
                if(card.RetreatCost != null)
                {
                    retreatCost = card.RetreatCost
                }

                return `${cardType} | ${card.Name} (${card.Hp} HP) | ${card.CardText} | Weakness: ${weakness} | Resistance: ${resistance} | Retreat Cost: ${retreatCost}`
            }
        }
        else
        {
            return "Unexpected Error"
        }  
               
    }
    else
    {
        return `Could not find ${set} ${number} ${cardName}. Please check leading zeroes on the number. (Also only use this command if !card doesn't work).`
    }
    
}

function onCooldown(channel)
{
    var cooldown = commandCooldowns.find(x => x.Channel.toLowerCase() === channel.toLowerCase())
    let timeCheck = new Date().getTime()
        
    return timeCheck < cooldown.Time;
}        

function setCooldown(channel)
{    
    let cdTime = new Date().getTime()              
    var objIndex = commandCooldowns.findIndex((x => x.Channel.toLowerCase() === channel.toLowerCase()));
    commandCooldowns[objIndex].Time = cdTime + 10000
}

function nthIndex(str, pat, n)
{
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
}

function populateCooldowns()
{
    var cdTime = new Date().getTime()
    for(var channel in channels)
    {        
        commandCooldowns.push(new CommandCooldown(`#${channels[channel]}`, '!card', cdTime))
    }
}
// #endregion