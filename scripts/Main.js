//Auto Rumble
//ads?
var theXml;
var theXmlCombo;
var theXmlMythic;
var theProperties;
var theSheet;

/**
* On sheet load add Throwdown menu. --> Menu > Throwdown
* Cant be renamed.. this is a Google call onOpen
*/
function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu( 'Throwdown' )
    .addSeparator()
    .addItem( 'Enable & Refresh', '_Enable' )
    .addItem( 'Disable', '_Disable' )
    .addItem( 'Manual Run', '_Run' )
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Auto Rumble')
                .addItem( 'Enable', 'enableRumble' )
                .addItem( 'Disable', 'disableRumble' )
                .addItem( 'Manual Run', 'manualeRumble' )
               )
    .addToUi();
   ui.createMenu( 'Custom Decks' )
    .addSeparator()
    .addItem( 'Import to sheet', 'ImportToSheet' )
    .addItem( 'Export to throwdown', 'ExportToThrowdown' )
    .addItem( 'Display in sheet', 'DisplayUserDeck' )
    .addToUi();
}

/**
 * On edit for Mobile controls.
 */
function onEditCustom(e) {
  if (e.range.getA1Notation() == 'I4') {
   var myValue = e.range.getValue();
    e.range.setValue('Loading task');
    if(myValue == 'Import to sheet'){ImportToSheet()}
    if(myValue == 'Export to throwdown'){ExportToThrowdown()}
    if(myValue == 'Display in sheet'){DisplayUserDeck()}
    e.range.setValue('Select a task');
    return
  }
    if (e.range.getA1Notation() == 'D11') {
   var myValue = e.range.getValue();
    e.range.setValue('Loading task');
    if(myValue == 'Enable & Refresh'){_Enable()}
    if(myValue == 'Disable'){_Disable()}
    if(myValue == 'Manual Run'){_Run()}
    e.range.setValue('Select a task');
      return
  }
      if (e.range.getA1Notation() == 'D12') {
   var myValue = e.range.getValue();
    e.range.setValue('Loading task');
    if(myValue == 'Enable'){enableRumble()}
    if(myValue == 'Disable'){disableRumble()}
    if(myValue == 'Manual Run'){manualeRumble()}
    e.range.setValue('Select a task');
      return
  }
}

/**
* Runs when Enable & Refresh calls it. --> Menu > Throwdown > Enable & Refresh
*/
function _Enable() {
    theProperties = PropertiesService.getScriptProperties()
    theSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName( 'Settings' );
    loadUserSettings();
    var myUserAuth = authenticateUser( getProperty( 'User_ID' ), getProperty( 'User_Token' ) );
    if ( myUserAuth == false ) {
        return false
    }
    if ( checkTrigger( 'Trigger_loaded' ) == false ) {
        createTrigger( 'Trigger_loaded' );
        updateNext( true )
        updateStatus( 'Account ' + getProperty( '_name' ) + ' Enabled, Waiting for next check ' );
    } else {
        updateStatus( 'Account ' + getProperty( '_name' ) + ' refresh finished' );
    }
    var myEnergy = getEnergy();
    updateEnergy( myEnergy[ 1 ], myEnergy[ 5 ], 'Arena' )
    updateEnergy( myEnergy[ 0 ], myEnergy[ 4 ], 'Adventure' )
    checkVersion()
}

/**
* Runs when user Disable calls it. --> Menu > Throwdown > Disable
*/
function _Disable() {
    updateEnergy( 0, 0, 'Arena' )
    updateEnergy( 0, 0, 'Adventure' )
    theProperties = PropertiesService.getScriptProperties()
    theSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName( 'Settings' );
    updateNext( false )
    updateStatus( 'Disabled - To Enable: Menu > Throwdown > Enable' );
    removeTriggers();
    PropertiesService.getScriptProperties().deleteAllProperties();
}

/**
* Runs when Manual Run calls it. --> Menu > Throwdown > Manual Run
*/
function _Run() {
    if ( checkTrigger( 'Trigger_loaded' ) != false ) {
        removeTriggers();
        createTrigger( 'Trigger_loaded' );
        updateNext( true )
    }
    Main();
}

/**
* Runs when the trigger calls it.
*/
function Trigger_loaded() {
    updateNext( true );
    Main();
}
/**
* Loads settings, logs in, and checks if running parameters are valid.
* return true/false
*/
function Main() {
    theSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName( 'Settings' );
    theProperties = PropertiesService.getScriptProperties()
    theXml = UrlFetchApp.fetch( 'https://cb-live.synapse-games.com/assets/cards.xml' ).getContentText();
    theXmlCombo = UrlFetchApp.fetch( 'https://cb-live.synapse-games.com/assets/cards_finalform.xml' ).getContentText();
    theXmlMythic = UrlFetchApp.fetch( 'https://cb-live.synapse-games.com/assets/cards_mythic.xml' ).getContentText();
    updateStatus( 'Started, logging in ' + formattedTime() );
    checkVersion()
    var myUserSettings = loadUserSettings();
    var myAuth = authenticateUser( getProperty( 'User_ID' ), getProperty( 'User_Token' ) );
    if ( myAuth == false ) {
        return false
    }
    if ( getProperty( 'Ad Boost' ) == 'Enabled' ) {
        updateStatus( 'Account ' + getProperty( '_name' ) + ' Loading boostAds ' + formattedTime() );
        var myBoost = boostAds(); //Boost every 30 minutes? why not!
      if(myBoost == false){
         Utilities.sleep( 6000 );
        var myBoost = boostAds();
      }
        Logger.log( 'Ad Boost:' + myBoost );
    }
    var myEnergy = getEnergy();
    updateEnergy( myEnergy[ 1 ], myEnergy[ 5 ], 'Arena' )
    updateEnergy( myEnergy[ 0 ], myEnergy[ 4 ], 'Adventure' )
    if ( checkIfActive( getProperty( '_url' ) ) == true ) {
        updateStatus( 'Account ' + getProperty( '_name' ) + ' Active Session found. Waiting 30 mins ' + formattedTime() );
        Logger.log( 'Active session found' );
        return false
    }
    if ( getProperty( 'Energy Check' ) == 'Enabled' ) {
        var myAdventureMax = myEnergy[ 4 ] - 2;
        if ( getProperty( 'Auto Adventure' ) == "Energy overflow control" ) {
            myAdventureMax = myEnergy[ 4 ];
        }
        var myArenaMax = myEnergy[ 5 ] - 1;
        if ( getProperty( 'Auto Arena' ) == "Energy overflow control" ) {
            myArenaMax = myEnergy[ 5 ];
        }
        if ( getProperty( 'Energy Check section' ) == 'playAdventure' && myEnergy[ 0 ] < myAdventureMax ) {
            updateStatus( 'Account ' + getProperty( '_name' ) + ' playAdventure not full. ' + formattedTime() );
            Logger.log( 'playAdventure not full' );
            return false;
        }
        if ( getProperty( 'Energy Check section' ) == 'Arena' && myEnergy[ 1 ] < myAdventureMax ) {
            updateStatus( 'Account ' + getProperty( '_name' ) + ' Arena not full. ' + formattedTime() );
            Logger.log( 'Arena not full' );
            return false;
        }
        if ( ( getProperty( 'Energy Check section' ) == 'Adventure or Arena' && myEnergy[ 1 ] >= myArenaMax ) || ( getProperty( 'Energy Check section' ) == 'Adventure or Arena' && myEnergy[ 0 ] >= myAdventureMax ) ) {
            Logger.log( 'FAIL!!!' )
        } else {
            updateStatus( 'Account ' + getProperty( '_name' ) + ' Neither are full. ' + formattedTime() );
            Logger.log( 'Neither are full' );
            return false;
        }
    }
    updateStatus( 'Account ' + getProperty( '_name' ) + ' Starting ' + formattedTime() );
    Logger.log( getEnergy() );
    _Farming();
    Logger.log( getEnergy() );
    updateStatus( 'Account ' + getProperty( '_name' ) + ' Finished ' + formattedTime() );
}
/**
* Runs all farming commands.
*/
function _Farming() {
	
	// =================================== Refill Challenge ===================================
    var myEnergy = getEnergy();
    if ( getProperty( 'Auto Refill Challenge' ) == "Enabled" && myEnergy[ 2 ] > 0 ) {
        Logger.log( '- - - - RefillChallenge Start - - - -' );
        for ( var i = 0; i < myEnergy[ 6 ]; i++ ) {
            updateStatus( 'Account ' + getProperty( '_name' ) + ' Loading Refill Challenge ' + formattedTime() );
            var myResult = playRefillChallenge();
            if ( myResult != false ) {
                addLog( '_logs_RefillChallenge', myResult )
            }
            Logger.log( myResult );
            if ( myResult == false ) {
                break;
            }
        }
        Logger.log( '- - - - RefillChallenge End - - - -' );
    }
	// =================================== Refill Challenge ===================================
	
	// ================================= Non Refill Challenge =================================
    if ( getProperty( 'Auto Non-Refill Challenge' ) == "Enabled" && myEnergy[ 3 ] > 0 ) {
        Logger.log( '- - - - NonRefillChallenge Start - - - -' );
        for ( var i = 0; i < myEnergy[ 7 ]; i++ ) {
            updateStatus( 'Account ' + getProperty( '_name' ) + ' Loading Non-Refill Challenge ' + formattedTime() );
            var myResult = playNonRefillChallenge();
            if ( myResult != false ) {
                addLog( '_logs_NoneRefillChallenge', myResult )
            }
            Logger.log( myResult );
            if ( myResult == false ) {
                break;
            }
        }
        Logger.log( '- - - - NonRefillChallenge End - - - -' );
    }
	// ================================= Non Refill Challenge =================================
	
	// ====================================== Adventure =======================================
    var myEnergy = getEnergy();
    if ( ( getProperty( 'Auto Adventure' ) == "Enabled" && myEnergy[ 0 ] > getProperty( '_IslandCost')) || ( getProperty( 'Auto Adventure' ) == "Energy overflow control" && myEnergy[ 0 ] >= myEnergy[ 4 ] ) ) {
        Logger.log( '- - - - Adventure Start - - - -' );
        var mySearchLength = myEnergy[ 4 ];
        Logger.log( 'SearchLength:' + mySearchLength )
        for ( var i = 0; i < mySearchLength; i++ ) {
            updateStatus( 'Account ' + getProperty( '_name' ) + ' Loading Adventure ' + formattedTime() );
            var myResult = playAdventure();
            if ( myResult != false ) {
                addLog( '_logs_Adventure', myResult )
            }
            Logger.log( myResult );
            var myEnergy = getEnergy();
            updateEnergy( myEnergy[ 0 ], myEnergy[ 4 ], 'playAdventure' )
            if ( getProperty( 'Auto Adventure' ) == "Energy overflow control" && myEnergy[ 0 ] < myEnergy[ 4 ] ) {
                break;
            }
            if ( myResult == false ) {
                break;
            }
        }
        completeAchievements( getProperty( '_url' ), '5007' );
        Logger.log( '- - - - playAdventure End - - - -' );
    }
	// ====================================== Adventure =======================================
	
	// ======================================== Arena =========================================
    var myEnergy = getEnergy();
    if ( ( getProperty( 'Auto Arena' ) == "Enabled" && myEnergy[ 1 ] > 0 ) || ( getProperty( 'Auto Arena' ) == "Energy overflow control" && myEnergy[ 1 ] >= myEnergy[ 5 ] ) ) {
        Logger.log( '- - - - Arena Start - - - -' );
        var mySearchLength = myEnergy[ 1 ];
        Logger.log( 'SearchLength:' + mySearchLength )
        for ( var i = 0; i < mySearchLength; i++ ) {
            updateStatus( 'Account ' + getProperty( '_name' ) + ' Loading Arena ' + formattedTime() );
            var myResult = playArena();
            if ( myResult != false ) {
                addLog( '_logs_Arena', myResult )
            }
            Logger.log( myResult );
            var myEnergy = getEnergy();
            updateEnergy( myEnergy[ 1 ], myEnergy[ 5 ], 'Arena' )
            if ( getProperty( 'Auto Arena' ) == "Energy overflow control" && myEnergy[ 1 ] < myEnergy[ 5 ] ) {
                break;
            }
            if ( myResult == false ) {
                break;
            }
            Utilities.sleep( 2000 );
        }
        completeAchievements( getProperty( '_url' ), '5008' );
        Logger.log( '- - - - Arena End - - - -' );
    }
	// ======================================== Arena =========================================
	
	// ==================================== Buy and Update ====================================
    completeAchievements( getProperty( '_url' ), '5009' );
    completeAchievements( getProperty( '_url' ), '5010' );
    if ( getProperty( 'Auto Buy/Upgrade Mission' ) == "Enabled" && checkAchievements( getProperty( '_url' ), '5009' ) == true ) {
        updateStatus( 'Account ' + getProperty( '_name' ) + ' Daily Mission ' + formattedTime() );
        Logger.log( '- - - - Auto Buy/Upgrade Mission Start - - - -' );
        var myResult = buyAndUpgradeCards();
        Logger.log( '- - - - Auto Buy/Upgrade Mission End - - - -' );
    }
	// ==================================== Buy and Update ====================================
	
	// =================================== Buy and Recycle ====================================
    if ( getProperty( 'Auto buy and recycle' ) == "Enabled" ) {
        updateStatus( 'Account ' + getProperty( '_name' ) + ' Buying & Recycling cards ' + formattedTime() );
        Logger.log( '- - - - Auto buy and recycle Start - - - -' );
        var myResult = buyAndRecycleCards();
        completeAchievements( getProperty( '_url' ), '5010' );
        Logger.log( '- - - - Auto buy and recycle End - - - -' );
    }
	// =================================== Buy and Recycle ====================================
	
	// ====================================== Ad Crates ===============-=======================
    if ( getProperty( 'Ad Crate' ) == 'Enabled' ) {
        updateStatus( 'Account ' + getProperty( '_name' ) + ' Opening AdCrates ' + formattedTime() );
        var myCrate = useAdCrates();
        Logger.log( 'Ad Crates:' + myCrate );
    }
	// ====================================== Ad Crates ===============-=======================
	
    var myEnergy = getEnergy();
    updateEnergy( myEnergy[ 1 ], myEnergy[ 5 ], 'Arena' )
    updateEnergy( myEnergy[ 0 ], myEnergy[ 4 ], 'Adventure' )
    completeAchievements( getProperty( '_url' ), '5012' );
    WriteLogs();
    completeAchievements( getProperty( '_url' ), '5001' );
}

/**
* Gets current and max energy.
* return energy
*/
function getEnergy() { //Returns Current and Max energy.
    // 0-playAdventure : 1-Arena : 2-Challenge : 3-NonRefillChallenge 
    // 4-MaxplayAdventure : 5-MaxplayArena : 6-MaxChallenge : 7-MaxNonRefillChallenge
    var myUrl = getProperty( '_url' );
    var myEnergySite = UrlFetchApp.fetch( myUrl + '&message=getUserAccount' );
    var myEnergyJson = JSON.parse( myEnergySite );
    var myChallengeSite = UrlFetchApp.fetch( myUrl + '&message=startChallenge' );
    var myChallengeJson = JSON.parse( myChallengeSite );
    var myArenaEnergy = myEnergyJson.user_data.stamina
    var myArenaEnergyMax = myEnergyJson.user_data.max_stamina
    var myAdventureEnergy = myEnergyJson.user_data.energy
    var myAdventureEnergyMax = myEnergyJson.user_data.max_energy
    if ( myChallengeJson.hasOwnProperty( 'active_events' ) ) {
    if ( myChallengeJson.active_events.hasOwnProperty( '102000' ) ) {
        var myChallengeSite = myChallengeJson.active_events[ 102000 ].challenge_data.energy.current_value;
    } else {
        var myChallengeSite = 0
    }
    if ( myChallengeJson.active_events.hasOwnProperty( '102000' ) ) {
        var myChallengeEnergyMax = myChallengeJson.active_events[ 102000 ].challenge_data.energy.max_value;
    } else {
        var myChallengeEnergyMax = 8
    }
    if ( myChallengeJson.active_events.hasOwnProperty( '103001' ) ) {
        var myNonRefillChallenge = myChallengeJson.active_events[ 103001 ].challenge_data.energy.current_value;
    } else {
        var myNonRefillChallenge = 0
    }
    if ( myChallengeJson.active_events.hasOwnProperty( '103001' ) ) {
        var myNonRefillChallengeMax = myChallengeJson.active_events[ 103001 ].challenge_data.energy.max_value;
    } else {
        var myNonRefillChallengeMax = 10
    }
    }else{
      var myChallengeSite = 0
      var myChallengeEnergyMax = 8
      var myNonRefillChallenge = 0
      var myNonRefillChallengeMax = 10
    }
    return [ parseInt( myAdventureEnergy ), parseInt( myArenaEnergy ), parseInt( myChallengeSite ), parseInt( myNonRefillChallenge ), parseInt( myAdventureEnergyMax ), parseInt( myArenaEnergyMax ), parseInt( myChallengeEnergyMax ), parseInt( myNonRefillChallengeMax ) ]
}

/**
* Check and see if there is a new script version.
*/
function checkVersion() {
    var mySettingsSheet = SpreadsheetApp.openById( '1e6Ru4wgPUD4CtKPVZDTKZ804w23Ulg9_iooKcgkC5Rk' ).getSheetByName( "Settings" );
    var myNewVersion = mySettingsSheet.getRange( "A1" ).getValue();
    var myActiveSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName( "Settings" );
    var myCurrentVersion = myActiveSheet.getRange( "A1" ).getValue();
    if ( myNewVersion > myCurrentVersion ) {
        myActiveSheet.getRange( 'C1' ).setValue( 'New Version Available -> http://tiny.cc/atbot' );
    }
}
