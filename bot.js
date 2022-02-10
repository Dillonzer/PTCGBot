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

// Define configuration options
const opts = {
  identity: {
    username: process.env.BOT_NAME,
    password: process.env.OAUTH_TOKEN
  },
  channels: channels
};

GetAllCards()
populateCooldowns()

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (channel, context, msg, self) 
{
    if (self) { return; } // Ignore messages from the bot

    if (msg === '!card')
    {
        return;
    }

    if(msg === '!cardhelp')
    {      
        client.say(channel, "https://dillonzer.github.io/ptcgBot.html")
        return
    }
    
    if(msg === '!setcodes')
    {
        client.say(channel, "https://dillonzer.github.io/ptcgBot.html")
        return
    }

    const command = msg.split(' ');

    if (command[0] === '!card') 
    {
        //check timeouts
        var cooldown = commandCooldowns.find(x => x.Channel.toLowerCase() === channel.toLowerCase())
        let timeCheck = new Date().getTime()
        
        if(timeCheck >= cooldown.Time)
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
            var cardAttack = GetCardAttack(set, cardName);
            client.say(channel, cardAttack);
            console.log(`* Executed ${command[0]} command on ${channel}`);
            let cdTime = new Date().getTime()              
            var objIndex = commandCooldowns.findIndex((x => x.Channel.toLowerCase() === channel.toLowerCase()));
            commandCooldowns[objIndex].Time = cdTime + 10000
        }
    }
}

function GetCardAttack (set, cardName) {
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
                return `There are ${filterCount.length} versions of this card in this set. Cannot show each.`
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

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

function GetAllCards()
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

function nthIndex(str, pat, n){
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