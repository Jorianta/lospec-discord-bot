const { MessageActionRow, MessageButton, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const Bank = require('./bank.js');

const suits = ["♥️", "♠️", "♦️", "♣️"],
    ranks = ["A",2,3,4,5,6,7,8,9,10,"J","Q","K"]

new Module('texas hold em', 'message', /^!poker \d{2} .+/i , (interaction) => {
    invitees = interaction.mentions.users

    buyin = parseInt(interaction.content.split(' ')[1]);

    try{
        interaction.startThread({
            name: title(interaction.author.username, true) + ' ' + "poker game",
            autoArchiveDuration: 60 * 24 ,
        }).then(async gameThread =>{
            yesButton = new MessageActionRow().addComponents(new MessageButton()
            .setCustomId('yes')
            .setLabel("Yes")
            .setStyle("SUCCESS"))

            //ask who wants to play. Start when the game owner says yes
            const buyInQuery = (await gameThread.send("Welcome to the game gentlemen. The buy in is Ᵽ"+buyin+". React ✅ to accept.")).createReactionCollector({ filter: (reaction, user) => reaction.emoji.name === '✅'})//(user.id != interaction.author.id) && 
            const startQuery = await gameThread.send({ content: `Start the game, ${interaction.author}? Players who haven't bought in will be left out.`, components: [yesButton], ephemeral: true })
            const confirmation = await startQuery.awaitMessageComponent({ filter: i => i.user.id === interaction.author.id, time: 60000 })
            buyInQuery.stop()

            players = buyInQuery.users.set(interaction.author.id, interaction.author).map(i => {return {user: i, chips: buyin, hand: []}})

            // for(let i=0; i<players.length; i++){
            //     Bank.adjustBalance(players[i].user.id, -buyin, 'Poker buy in')
            // }

            confirmation.update({content: "Let's play.", components: []})
            
            let table = dealCards(players);
            
            console.log(players[0].hand)
            console.log(table)

            // while(players.length >= 1){ 

            // table = dealCards(players)
            
            // console.log(players[0].hand)
            // console.log(table)

            // }
            gameThread.send("The game is over.")
        })
    }
    catch(e) {
        console.log(e)
    }
});

//stolen from threads-only.js. might be better to export it there.
function title(string, plural) {
     let newString = string.charAt(0).toUpperCase() + string.slice(1);

    if (plural) newString += "'";
    if (plural && string.slice(-1) !== 's') newString += "s";

    return newString;
}

function shfl(a){ // Durstenfeld shuffle
    for(let j,i=a.length;i>1;){
     j=Math.floor(Math.random()*i--);
     if (i!=j) [a[i],a[j]]=[a[j],a[i]]
    }
    return a
   }

function buildDeck(){
    let deck = []

   suits.forEach(s=>ranks.forEach(v=>
      deck.push(s+"-"+v)));
   
   return shfl(deck);
}

function dealCards(players){
    let deck = buildDeck()
    console.log(deck)

    for(let i=0; i<players.length; i++){
        players[i].hand = [].concat(deck.shift(), deck.shift());
    }

    return deck.slice(0,5)
}

function playRound(thread, players, smallBlind=0){
    let pot = 0;
    let table = dealCards(players);
    let revealed = table.slice(0,3)

    thread.send()

            
    console.log(players[0].hand)
    console.log(table)
}

function scoreHand(hand){

}

function hasFlush(hand){
    let suits = hand.map(i => i.suit)

    let count = [0,0,0,0];

    let i=0
    while(i<suits.length && !count.includes(5))
    {
        count[suits[i]++]
        i++
    }

    if (count.includes(5)){
        //it has a flush
    }
}

function hasStraight(hand){
    
}