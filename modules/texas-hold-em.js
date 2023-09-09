const { MessageActionRow, MessageButton, ButtonStyle, SlashCommandBuilder } = require('discord.js');

new Module('texas hold em', 'message', ^, function interaction => {

    interaction.startThread({
        name: title(message.author.username, true) + ' ' + "poker game",
        autoArchiveDuration: 60 * 24 ,
    }).then(newThread =>{
        newThread.send("Welcome to the game gentlemen")
    }
    )
}

//stolen from threads-only.js. might be better to export it there.
function title(string, plural) {
     let newString = string.charAt(0).toUpperCase() + string.slice(1);

    if (plural) newString += "'";
    if (plural && string.slice(-1) !== 's') newString += "s";

    return newString;
}