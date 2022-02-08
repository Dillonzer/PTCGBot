import fetch from "node-fetch";
import tmi from 'tmi.js'
import dotenv from 'dotenv'
dotenv.config();

function Card(name, set, number, cardText, imageLink)
{
    this.Name = name;
    this.Set = set;
    this.Number = number;
    this.CardText = cardText;
    this.ImageLink = imageLink;
}

GetAllCards()
var allCards = []

// Define configuration options
const opts = {
  identity: {
    username: process.env.BOT_NAME,
    password: process.env.OAUTH_TOKEN
  },
  channels: [
    'Dillonzer'
  ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  if (msg === '!card')
  {
      return;
  }

  if(msg === '!cardhelp')
  {      
    client.say(target, "Example !card fst mew vmax")
    return
  }

  const command = msg.split(' ');

  if (command[0] === '!card') {
    var cardDetails = msg.replace('!card', '')
    var setSplit  = cardDetails.split(' ')
    if(setSplit.length < 3)
    {
        client.say(target, "Please use the command as !card setAbbr cardName")
        return
    }
    var set = setSplit[1]
    var cardName = cardDetails.substring(nthIndex(cardDetails, ' ', 2))
    var cardAttack = GetCardAttack(set, cardName);
    client.say(target, `${cardAttack}`);
    console.log(`* Executed ${command[0]} command`);
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
                    return `${card.Name} | ${card.Set} | ${card.CardText}`
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
                return `${card.Name} | ${card.Set} |  ${card.CardText}`
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
            allCards.push(new Card(data[index].name, data[index].set.ptcgoCode, data[index].number, data[index].cardText, data[index].imageUrlHiRes));
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