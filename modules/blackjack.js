const { MessageActionRow, MessageButton, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const Bank = require('./bank.js');
const e = require('express');

const PLAY = {
	command: 'play-blackjack', 
	description: 'Play Blackjack against me!',
    options: [{
    name: 'bet',
    type: 4,
    description: 'Your wager for the game (optional).',
    required: false
}]
};

const ranks = ["A",2,3,4,5,6,7,8,9,10,"J","Q","K"]

new Module('Blackjack', 'message', PLAY, async (interaction) => {
    await interaction.deferReply()
    let bet = (interaction.options.getInteger('bet')||0);
    if(bet<0) {
        interaction.editReply({ content: "You have to bet a positive amount of Pikzels, or bet nothing if you just want to play for fun!", ephemeral: true })
        return
    };
    try{
        if(bet>0){
            Bank.getBalance(interaction.user.id).then(async (f) => {
                console.log(f)
                gameLoop(interaction,bet, f)
            })
        }
        else gameLoop(interaction)
    }catch(e) {
        console.log(e)
        interaction.editReply({content: 'Something went wrong... I guess the only winning move is not to play.', embeds:[], components:[]})
    }
});

async function gameLoop(interaction, bet=0, playerFunds = 0)
{
    let playerid = interaction.user.id
    let playerName = interaction.user.username

    const collectorFilter = i => {return i.user.id === playerid;}
    
    if(bet>0) 
    {
        if(bet>playerFunds)
        {
            interaction.editReply({ content: "Sorry "+playerName+", I can't give credit! Come back when you're a little... mmm... **richer!**", ephemeral: true })
            return
        }
        playerFunds -= bet
    }

    let dealer = {count:0, hasAce: false, cards: []};
    let player = {count:0, hasAce: false, cards: []};

    //hit dealer and player twice. Taking turns doesnt matter but its tradition.
    hitHand(dealer)
    hitHand(player)
    hitHand(dealer)

    let yes = new MessageButton()
        .setCustomId('y')
        .setLabel("Yes")
        .setStyle("SUCCESS")
    let no = new MessageButton()
        .setCustomId('n')
        .setLabel("No")
        .setStyle("DANGER")
    let actionBar = new MessageActionRow()
        .addComponents(yes, no);

    let playerResponse

    //DOUBLE DOWN//
    if(bet>0 && playerFunds>bet){
        const doubleQuery = await interaction.editReply({embeds:[{
            title:"Welcome to the Table, "+playerName+"!",
            description: "**Dealer's hand: **"+ dealer.cards[0] +
            ",? \n**Your hand: **"+ player.cards +
            "\n**Your bet: **"+ bet + 
            "Ᵽ\nWould you like to double down and add "+bet+"Ᵽ to your bet?"}], components: [actionBar]});

        try {
            playerResponse = await doubleQuery.awaitMessageComponent({ filter: collectorFilter, time: 60000 })

            if(playerResponse && playerResponse.customId == 'y') {
                playerFunds -= bet
                bet*=2
            }

            playerResponse.update({embeds:[{title:"Welcome to the Table, "+playerName+"!",
                description: "**Dealer's hand: **"+ dealer.cards[0] +",? \n**Your hand: **"+ player.cards +
                "\n**Your bet: **"+ bet +
                "Ᵽ \nIf you do nothing, you surrender!"}], components: [actionBar]});
        }
        catch(e) {

        }
    }
    
    hitHand(player)

    actionBar = buildActionBar()

    //GAMEPLAY//
    const gameQuery = await interaction.editReply({embeds:[{
        title:"Welcome to the Table, "+playerName+"!",
        description: "**Dealer's hand: **"+ dealer.cards[0] +
        ",? \n**Your hand: **"+ player.cards + 
        "\n**Your bet: **"+ bet +
        "Ᵽ \nIf you do nothing, you surrender!"}], components: [actionBar]})

    //2 is in play. 1 is a stay. 0 is a surrender. -1 is a bust
    let result = 2

    while(result>1){

        try {
            playerResponse = await gameQuery.awaitMessageComponent({ filter: collectorFilter, time: 60000 })
        } catch (e) {
            //If the player ever stops responding, they surrender
            result = 0;
            break;
        }

        let move = playerResponse.customId
        if(move === 'hit')
        {
            hitHand(player)
            if(scoreHand(player) > 21)
            {result = -1
                break;
            }
        }
        else if(move === 'stay')
        {
            result = 1
            break;
        }
        else
        {
            result = 0
            break
        }

        playerResponse.update({embeds:[{title:"Welcome to the Table, "+playerName+"!",
            description: "**Dealer's hand: **"+ dealer.cards[0] +
            ",? \n**Your hand: **"+ player.cards + 
            "\n**Your bet: **"+ bet +
            "Ᵽ \nIf you do nothing, you surrender!"}], components: [actionBar]});
    }

    //RESULTS//
    let resultTitle, resultMessage = ""
    let payout = 0;

    if(result == -1)
    {
        resultTitle=playerName+" Busted..."
        resultMessage="Got a little bit too greedy!"
    }
    else if(result == 0)
    {
        resultTitle=playerName+" Surrendered..."
        resultMessage="Don't let the pressure get to you!"
        payout = Math.ceil(bet/2)
    }
    else
    {
        let playerScore = scoreHand(player)
        let dealerScore = scoreHand(dealer)

        //I believe the dealer is REQUIRED to hit at 16 or less, even if they are winning
        while(dealerScore<=16)
        {
            hitHand(dealer)
            dealerScore = scoreHand(dealer)
        }

        //we dont need to check if the player is over 21, we already did.
        if(dealerScore>21 || playerScore>dealerScore){
            resultTitle=playerName+" Won!"
            resultMessage="Luck is on your side today!"
            payout = 2*bet
        }
        else if(dealerScore===playerScore){
            resultTitle=playerName+" Pushed."
            resultMessage="At least you get your money back."
            payout = bet
        }
        else{
            resultTitle=playerName+" Lost..."
            resultMessage="The house always wins!"
        }
    }

    //Payout pikzels
    payout -= bet;
    if(payout!=0) await Bank.adjustBalance(interaction.user.id, payout, "Gambling")

    await playerResponse.update({embeds:[{title:resultTitle,
                    description: "**Dealer's hand: **"+ dealer.cards +
                    "\n**Your hand: **"+ player.cards + 
                    "\n**Your bet: **"+ bet +
                    "Ᵽ\n**Your payout: **"+ payout +
                    "Ᵽ\n" +resultMessage}], components: []});

}


function hitHand(hand){
    let draw = pickRandom(ranks);
    let v = 1;

    switch(draw)
    {
        //We have at least one ace
        case "A": hand.hasAce=true; break;

        //faces are 10
        case "J": 
        case "K":
        case "Q": v = 10; break;

        //Everything else is its number
        default: v = draw;
    }
    hand.count += v;
    hand.cards.push(draw)
}

function scoreHand(hand) {
    let difference = 21 - hand.count

    //If we don't have an ace to turn into an 11, or doing so would bust, we're done.
    if(!hand.hasAce || difference<10) return hand.count

    //heres the thing. Only one ace can be worth 11. The others have to be worth 1, or you bust.
    return (hand.count) + 10
}

function buildActionBar(locked = false){
    actionBar = new MessageActionRow()

    let hit = new MessageButton()
            .setDisabled(locked)
            .setCustomId('hit')
            .setLabel("Hit")
            .setStyle("PRIMARY")
    let stay = new MessageButton()
            .setDisabled(locked)
            .setCustomId('stay')
            .setLabel("Stay")
            .setStyle("SECONDARY")
    let surrender = new MessageButton()
            .setDisabled(locked)
            .setCustomId('quit')
            .setLabel("Surrender")
            .setStyle("DANGER")

    actionBar.addComponents(hit,stay,surrender)

    return actionBar
}
