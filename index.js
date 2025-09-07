const { Client, GatewayIntentBits, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify your identity by providing your real name'),
    new SlashCommandBuilder()
        .setName('postverify')
        .setDescription('Post a verification button (Admin only)')
        .setDefaultMemberPermissions('0') // Requires administrator permission
];

client.once('clientReady', async c => {
    console.log(`Logged in as ${c.user.tag}`);

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(client.token);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(c.user.id),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'verify_button') {
        // Show the modal for verification
        const modal = new ModalBuilder()
            .setCustomId('nameEntry')
            .setTitle('Verification')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('realName')
                        .setLabel('Enter your full name')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );
        await interaction.showModal(modal);
    }

    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'verify') {
            // Send a separate message with a verification button
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('Click to Verify')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✅')
            );

            await interaction.reply({ content: 'Verification button created!', flags: 64 });
            await interaction.followUp({
                content: '**Please click the button below to verify your identity:**',
                components: [row]
            });
        }

        if (interaction.commandName === 'postverify') {
            // Check if user has admin permissions
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({ content: 'You need administrator permissions to use this command.', flags: 64 });
                return;
            }

            await interaction.reply({
                content: 'Use the `/verify` command to verify your identity!',
                ephemeral: false
            });
        }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'nameEntry') {
        // Access the name that the user entered
        const fullName = interaction.fields.getTextInputValue('realName');

        try {
            // Check if bot has permission to manage nicknames
            if (!interaction.guild.members.me.permissions.has('ManageNicknames')) {
                await interaction.reply({
                    content: 'I don\'t have permission to change nicknames. Please ask an administrator to give me the "Manage Nicknames" permission.',
                    flags: 64
                });
                return;
            }

            // Check if trying to change nickname of someone with higher role
            if (interaction.member.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                await interaction.reply({
                    content: 'I cannot change your nickname because you have a role equal to or higher than mine. Please ask an administrator to help.',
                    flags: 64
                });
                return;
            }

            // Change nickname
            await interaction.member.setNickname(fullName);

            // Assign the specific role by ID
            const roleId = '1414034577554669569';
            try {
                await interaction.member.roles.add(roleId);
                await interaction.reply({
                    content: `✅ Verification complete! Your nickname has been set to: **${fullName}** and you've been assigned the verification role.`,
                    flags: 64
                });
            } catch (roleError) {
                console.error('Error adding role:', roleError);
                await interaction.reply({
                    content: `✅ Your nickname has been set to: **${fullName}**, but I couldn't assign the role. Please contact an administrator.`,
                    flags: 64
                });
            }
        } catch (error) {
            console.error('Error setting nickname:', error);
            await interaction.reply({ content: 'There was an error setting your nickname. Please contact an administrator.', flags: 64 });
        }
    }
});

client.login(process.env.BOT_TOKEN);
