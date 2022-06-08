import fetch from "node-fetch";
import tmi from 'tmi.js'
import dotenv from 'dotenv'
import SpellChecker from 'simple-spellchecker'

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
var channels = []
var ffzChannels = []

const opts = {
    identity: {
      username: process.env.BOT_NAME,
      password: process.env.OAUTH_TOKEN
    }
  };

const dictionary = SpellChecker.getDictionarySync("pokemon")
/* Only run after new set drops
SpellChecker.normalizeDictionary(".\\pokemon.dic", function(err, success) {
    if(success) console.log("The file was normalized");
});*/ 

const client = new tmi.client(opts);

client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

setInterval(updateChannelList, 60000);

// #region Bot Function
async function onMessageHandler (channel, context, msg, self) 
{

    if (self) { return; } // Ignore messages from the bot    

    const command = msg.split(' ');
    
    
    if(!(await isModInChannel(channel, 'PTCGBot')))
    {
        if(command[0] === '!cardhelp' || command[0] === '!setcodes' || command[0] === '!card' || command[0] === '!cardnum')
        {
            if(!onCooldown(channel))
            {
                setCooldown(channel)
                client.say(channel, "Please give PTCGBot Mod to work properly.")
                return
            }
        }
    }

    if (msg === '!card')
    {
        return;
    }

    if(command[0] === '!cardhelp' || command[0] === '!setcodes')
    {      
        if(!onCooldown(channel))
        {
            setCooldown(channel)
            helpInfo(channel)
            console.log(`* Executed ${msg} on ${channel}`);
        }
    }


    if (command[0] === '!card') 
    {
        if(!onCooldown(channel))
        {
            setCooldown(channel)
            cardCommand(msg, channel)
            console.log(`* Executed ${msg} on ${channel}`);
        }
    }

    if(command[0] === '!cardnum')
    {
        if(!onCooldown(channel))
        {
            setCooldown(channel)
            cardNumCommand(msg, channel)
            console.log(`* Executed ${msg} on ${channel}`);
        }
    }
   
}

function onConnectedHandler (addr, port) 
{
  console.log(`* Connected to ${addr}:${port}`);
  initialLoad()
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

function initialLoad()
{
    var apiCall = process.env.API_URL+"/deckutils/ptcgBot/getUserList";
    fetch(apiCall).then(response => {
    return response.json();
    }).then(data => {     
        var splitData = data['userlist'].split(',')  
        channels = splitData
        getAllCards()
        joinChannels()
        getFFZList()
        
    }).catch(err => {
        console.log(err)
    });
}

function updateChannelList()
{
    var apiCall = process.env.API_URL+"/deckutils/ptcgBot/getUserList";
    fetch(apiCall).then(response => {
    return response.json();
    }).then(data => {     
        var splitData = data['userlist'].split(',')  
        channels = splitData
        partChannels()
        joinChannels()
        getFFZList()
        
    }).catch(err => {
        console.log(err)
    });
}

function getFFZList()
{
    var apiCall = process.env.API_URL+"/deckutils/ptcgBot/ffz/getUserList";
    fetch(apiCall).then(response => {
    return response.json();
    }).then(data => {
        var splitData = data['userlist'].split(',')  
        ffzChannels = splitData        
    }).catch(err => {
        console.log(err)
    });
}

function joinChannels()
{
    var lowerCaseCurrentChannels = []
    client.getChannels().forEach(function(ch) {
        lowerCaseCurrentChannels.push(ch.toLowerCase())
    })

    channels.forEach(function(channel) {
        if(!lowerCaseCurrentChannels.includes(channel.toLowerCase()))
        {
            client.join(channel).then((data) => {
                console.log("Joined "+channel)
                var cdTime = new Date().getTime()                
                commandCooldowns.push(new CommandCooldown(channel, '!card', cdTime))
            }).catch((err) => {
                if(err == 'No response from Twitch.')
                {
                    console.log('Issue joining '+ channel+'. Trying again...')
                    retryJoinChannels(channel)
                }
                else
                {
                    console.log(err)
                }
            });
        }
    })
}

function retryJoinChannels(channel)
{
    client.join(channel).then((data) => {
        console.log("Joined "+channel)
        var cdTime = new Date().getTime()                
        commandCooldowns.push(new CommandCooldown(channel, '!card', cdTime))
    }).catch((err) => {
        if(err == 'No response from Twitch.')
        {
            console.log('Issue joining '+ channel+'. Trying again...')
            retryJoinChannels(channel)
        }
        else
        {
            console.log(err)
        }
    });
}

function partChannels()
{
    var lowerCaseCurrentChannels = []
    client.getChannels().forEach(function(ch) {
        lowerCaseCurrentChannels.push(ch.toLowerCase())
    })

    lowerCaseCurrentChannels.forEach(function(channel) {
        if(!channels.includes(channel.toLowerCase()))
        {
            client.part(channel).then((data) => {
                console.log("Left "+channel)
                var index = commandCooldowns.findIndex(x => x.Channel.toLowerCase() === channel.toLowerCase())
                commandCooldowns.splice(index, 1)
            }).catch((err) => {
                console.log(err)
            });
        }
    })
}
// #endregion

// #region Commands
function cardCommand(msg, channel)
{
    var cardDetails = msg.replace('!card', '')
    var setSplit  = cardDetails.split(' ')
    var set = setSplit[1]
    //check if set was supplied, if yes - normal. If not, new function
    var isSetValid = validSet(set)
    if(isSetValid)
    {
        var cardName = cardDetails.substring(nthIndex(cardDetails, ' ', 2))
        cardName = replaceCardName(cardName).trim()
        var spelledCorrectly = dictionary.spellCheck(cardName)
        if(!spelledCorrectly)
        {
            var suggestions = dictionary.getSuggestions(cardName);
            var joinedSuggestions = suggestions.join()
            if(suggestions.length > 0)
            {
                client.say(channel, `Could not find ${cardName}. Here are some suggestions: [${joinedSuggestions}]`)        
            } 
            else
            {
                client.say(channel, `Could not find ${cardName}.`)      
            }
        }
        else
        {
            var cardAttack = getCardAttack(set, cardName);
            client.say(channel, ffzCheck(channel, cardAttack));
        }
    }
    else
    {
        var cardName = cardDetails
        cardName = replaceCardName(cardName).trim()
        var spelledCorrectly = dictionary.spellCheck(cardName)
        if(!spelledCorrectly)
        {
            var suggestions = dictionary.getSuggestions(cardName);
            var joinedSuggestions = suggestions.join()
            if(suggestions.length > 0)
            {
                client.say(channel, `Could not find ${cardName}. Here are some suggestions: [${joinedSuggestions}]`)        
            } 
            else
            {
                client.say(channel, `Could not find ${cardName}.`)      
            }
        }
        else
        {
            var cardAttack = getCardAttackWithoutSet(cardName)
            client.say(channel, ffzCheck(channel, cardAttack));
        }
    }
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
    cardName = replaceCardName(cardName)
    var cardAttack = getCardAttackWithNumber(set, cardName, num);
    client.say(channel, ffzCheck(channel, cardAttack));
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
                    var cardType = cardTypeReplace(card.Type)

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
                var cardType = cardTypeReplace(card.Type)

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
            var cardType = cardTypeReplace(card.Type)

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

function getCardAttackWithoutSet(cardName)
{
    var filterCount = allCards.filter(x => x.Name.toLowerCase() === cardName.trim().toLowerCase())
    if(filterCount.length > 0)
    {        
        if(filterCount.length > 1)
        {
            var differentText = false;
            var initialText = filterCount[0].CardText

            for(var i in filterCount)
            {
                var tempText = filterCount[i].CardText
                if(initialText != tempText)
                {
                    differentText = true;
                    break
                }
            }
            
            var card = filterCount.find(x => x.Name.toLowerCase() === cardName.trim().toLowerCase())

            if(!differentText || card.Type.includes("Trainer"))
            {
                if(card != undefined || card != null)
                {
                    var cardType = cardTypeReplace(card.Type)

                    if(card.Hp == null)
                    {
                        return `${cardType} | ${card.Name} | ${card.Set} | ${card.CardText}`
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

                        return `${cardType} | ${card.Name} (${card.Hp} HP) | ${card.Set} | ${card.CardText} | Weakness: ${weakness} | Resistance: ${resistance} | Retreat Cost: ${retreatCost}`
                    }
                }
                else
                {
                    return "Unexpected Error"
                }
            }
            else
            {
                var returnString = `There are ${filterCount.length} versions of this card with different text. Please supply the set with this search (ie: !card setAbbr cardName)`
                return returnString
            }
        }
        else
        {
            var card = allCards.find(x => x.Name.toLowerCase() === cardName.trim().toLowerCase())
            if(card != undefined || card != null)
            {
                var cardType = cardTypeReplace(card.Type)

                if(card.Hp == null)
                {
                    return `${cardType} | ${card.Name} | ${card.Set} | ${card.CardText}`
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

                    return `${cardType} | ${card.Name} (${card.Hp} HP) | ${card.Set} | ${card.CardText} | Weakness: ${weakness} | Resistance: ${resistance} | Retreat Cost: ${retreatCost}`
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
        return `Could not find ${cardName}`
    }
}

function validSet(set)
{    
    var set = allCards.filter(x => x.Set.toLowerCase() === set.toLowerCase())
    return set.length > 0
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
    commandCooldowns[objIndex].Time = cdTime + 5000
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

function ffzCheck(channel, cardAttack)
{
    if(ffzChannels.includes(channel.toLowerCase()))
    {
        cardAttack = cardAttack.replaceAll("[C]", "ptcgC ")
        cardAttack = cardAttack.replaceAll("[D]", "ptcgD ")
        cardAttack = cardAttack.replaceAll("[F]", "ptcgF ")
        cardAttack = cardAttack.replaceAll("[G]", "ptcgG ")
        cardAttack = cardAttack.replaceAll("[L]", "ptcgL ")
        cardAttack = cardAttack.replaceAll("[M]", "ptcgM ")
        cardAttack = cardAttack.replaceAll("[P]", "ptcgP ")
        cardAttack = cardAttack.replaceAll("[R]", "ptcgR ")
        cardAttack = cardAttack.replaceAll("[W]", "ptcgW ")
        cardAttack = cardAttack.replaceAll("[Y]", "ptcgY ")
        cardAttack = cardAttack.replaceAll("[N]", "ptcgN ")

        cardAttack = cardAttack.replace("Retreat Cost: 1","Retreat Cost: ptcgC" )
        cardAttack = cardAttack.replace("Retreat Cost: 2","Retreat Cost: ptcgC ptcgC" )
        cardAttack = cardAttack.replace("Retreat Cost: 3","Retreat Cost: ptcgC ptcgC ptcgC" )
        cardAttack = cardAttack.replace("Retreat Cost: 4","Retreat Cost: ptcgC ptcgC ptcgC ptcgC" )
    }

    return cardAttack
}

function cardTypeReplace(replaceCardType)
{
    var cardType = replaceCardType.replace("Fire","[R]")
    cardType = cardType.replace("Fairy","[Y]")
    cardType = cardType.replace("Fighting","[F]")
    cardType = cardType.replace("Water","[W]")
    cardType = cardType.replace("Colorless","[C]")
    cardType = cardType.replace("Lightning","[L]")
    cardType = cardType.replace("Grass","[G]")
    cardType = cardType.replace("Psychic","[P]")
    cardType = cardType.replace("Darkness","[D]")
    cardType = cardType.replace("Metal","[M]")
    cardType = cardType.replace("Dragon","[N]")

    return cardType
}

function replaceCardName(cardName)
{
    cardName = cardName.replace('`', '\'')
    cardName = cardName.replace('’', '\'')        
    cardName = cardName.replace('‘', '\'')
    cardName = cardName.replace('“', '\"')
    cardName = cardName.replace('”', '\"') 
    cardName = cardName.toLowerCase().replace("é", "e")

    return cardName
}

async function isModInChannel(channel, username) {
    try
    {
        const list = await client.mods(channel)        
        if(!list.includes(username.toLowerCase()))
        {
            console.log("Not a mod in "+channel)
            return false
        }
        return true
    }
    catch(err) {
        console.log(err)
        return false;
    }
}


// #endregion