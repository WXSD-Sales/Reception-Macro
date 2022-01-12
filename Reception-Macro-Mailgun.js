import xapi from 'xapi';


// Mailgun sandbox details
const API_BASE_URL = 'https://api.mailgun.net/v3/<SANDBOX-DOMAIN>/messages';
const USERNAME = 'api';
const API_Key = '################';
const TO = 'user@example.com';
const FROM = 'mailgun@<SANDBOX-DOMAIN>';


// Set the number for the auto dial button to call
const NUMBER = 'staff@example.com';


// Show call controls while in call
const SHOW_INCALL_CONTROLS = true;

///////////////////////////////////
// Do not change anything below
///////////////////////////////////

// Convert the usernamae and password into hash for basic auth with mailgun
const hash = btoa(`${USERNAME}:${API_Key}`);

// Varible to store name entered
let  tempName = '';


// Enable the HTTP client if it isn't already
xapi.Config.HttpClient.Mode.get().then(value => {
  console.log('HTTP Client is : ' + value);
  if(value == 'Off'){
    console.log('Enabling HTTP Client');
    xapi.Config.HttpClient.Mode.set('On');
  }
});

// Hide the user interface
xapi.Config.UserInterface.Features.HideAll.get().then(value => {
  console.log('Hide UI is : ' + value);
  if(value == 'False'){
    console.log('Hiding the UI');
    xapi.Config.UserInterface.Features.HideAll.set("True");
  }
});

// Hide the settings menu
xapi.Config.UserInterface.SettingsMenu.Visibility.get().then(value => {
  console.log('Settings Visibility is : ' + value);
  if(value == 'Auto'){
    console.log('Hiding the settings');
    xapi.Config.UserInterface.SettingsMenu.Visibility.set('Hidden');
  }
});


// Add the Button to the touch panel
// Change the color, icon and name as desired
xapi.command('UserInterface Extensions Panel Save', {
    PanelId: 'send_email'
    }, `<Extensions>
      <Version>1.8</Version>
      <Panel>
        <Order>1</Order>
        <Type>Home</Type>
        <Icon>Home</Icon>
        <Color>#A866FF</Color>
        <Name>Check In</Name>
        <ActivityType>Custom</ActivityType>
      </Panel>
    </Extensions>`);

// Add the Button to the touch panel
xapi.command('UserInterface Extensions Panel Save', {
    PanelId: 'place_call'
    }, `<Extensions>
      <Version>1.8</Version>
      <Panel>
        <Order>1</Order>
        <Type>Home</Type>
        <Icon>Helpdesk</Icon>
        <Color>#FF0000</Color>
        <Name>Call for assistance</Name>
        <ActivityType>Custom</ActivityType>
      </Panel>
    </Extensions>`);

// This function displays the panel depending on state
function showPanel(state){

  let message = '';
  let name = '';
  let name_button = '';
  let submit = '';
  switch(state){
    case 'initial':
      message = 'Please enter your name to check in';
      name = '';
      name_button = 'Enter Name';
      submit = '';
      break;
    case 'submit':
      message = 'Press check in when ready';
      name_button = 'Change Name';
      name = `<Widget>
                  <WidgetId>name_text</WidgetId>
                  <Name>Name Entered: ${tempName}</Name>
                  <Type>Text</Type>
                  <Options>size=2;fontSize=normal;align=center</Options>
                </Widget>`;
      submit = `<Row>
                    <Widget>
                      <WidgetId>submit_button</WidgetId>
                      <Name>Check In</Name>
                      <Type>Button</Type>
                      <Options>size=2</Options>
                    </Widget>
                  </Row>`;
      break;
  }

  let panel = `<Extensions>
    <Version>1.8</Version>
    <Panel>
      <Order>9</Order>
      <Origin>local</Origin>
      <Type>Never</Type>
      <Icon>Webex</Icon>
      <Color>#A8660</Color>
      <Name>Check_In_1</Name>
      <ActivityType>Custom</ActivityType>
      <Page>
        <Name>Check In</Name>
        <Row>
          <Widget>
            <WidgetId>message</WidgetId>
            <Name>${message}</Name>
            <Type>Text</Type>
            <Options>size=4;fontSize=normal;align=center</Options>
          </Widget>
        </Row>
        <Row>
          ${name}
          <Widget>
            <WidgetId>enter_name</WidgetId>
            <Name>${name_button}</Name>
            <Type>Button</Type>
            <Options>size=2</Options>
          </Widget>
        </Row>
        ${submit}
        <PageId>ticTac~Toe</PageId>
        <Options>hideRowNames=1</Options>
      </Page>
    </Panel>
  </Extensions>
  `;

  xapi.command('UserInterface Extensions Panel Save', {
        PanelId: 'Check_In_1'
    }, panel
  ).then((event) => {
          xapi.command('UserInterface Extensions Panel Open', {
              PanelId: 'Check_In_1'
          })
      });
}



// Listen for clicks on the buttons
xapi.Event.UserInterface.Extensions.Widget.Action.on((event) => {

    if (event.Type !== 'clicked')
      return
      
    if (event.WidgetId == 'enter_name'){
      console.log('enter name clicked');
      xapi.command('UserInterface Message TextInput Display', {
            FeedbackId: 'enter_name',
            Text: 'Please enter your name',
            InputType: 'SingleLine',
            Placeholder: 'Name',
            Duration: 0,
          }).catch((error) => { console.error(error); });
    }
    else if (event.WidgetId == 'submit_button'){
      console.log('submit button clicked');
      xapi.command('UserInterface Extensions Panel Close');
      const timestamp = new Date();

      const PAYLOAD = { 
        "to": TO,
        "from": FROM, 
        "subject": tempName+' just checked in',
        "text": `${tempName} just checked in at ${timestamp}`
      }
      mailgunSend(PAYLOAD);
    }
    
  });

// Listen for text inputs
xapi.event.on('UserInterface Message TextInput Response', (event) => {
  switch(event.FeedbackId){
    case 'enter_name':
      tempName = event.Text;
      console.log('Name Entered: ' + tempName);
      showPanel('submit');
      break; 
  }
});


// Listen for initial button presses
xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {
    if(event.PanelId == 'send_email'){
      tempName = '';
      console.log('Send Email Selected');
      showPanel('initial')
    } else if (event.PanelId == 'place_call') {
      console.log('Place Call Selected');

      xapi.Command.Dial(
        {  Number: NUMBER });

    }
});



// This function sends an email via mailgun
// the payload requires a payload object containting
// to, from, subject and text
function mailgunSend(data){

  console.log('Sending Email');

  // Convert payload to form data structure
	const parameters = `?to=${data.to}&from=${data.from}&subject=${data.subject}&text=${data.text}`;

  console.log(parameters);
  
  const URL = API_BASE_URL+encodeURI(parameters);

  // Sending payload
  xapi.command('HttpClient Post', {
    Header: [
    "Host: mailgun.org",
    "Authorization: Basic " + hash] , 
    Url: URL,
    ResultBody: 'plaintext'
  }, '')
  .then((result) => {
    console.log('Email sent');
    console.log(result.Body);
    xapi.Command.UserInterface.Message.Alert.Display
      ({ Duration: 3
      , Text: 'Check in successful'
      , Title: 'Success'});
  })
  .catch((err) => {
    console.log("Failed: " + JSON.stringify(err));
    console.log(err);
        
    // Should close panel and notifiy errors
    xapi.Command.UserInterface.Message.Alert.Display
        ({ Duration: 3
        , Text: 'Could not send email'
        , Title: 'Error'});
  });

}

function detectCallAnswered(event){

  // Log all Call Answerstate events
  console.log(event);
  
  // Check that it is Answered and that currentMarco is true
  if(event != 'Answered' && SHOW_INCALL_CONTROLS == true )
    return;
 
  console.log('Call answered, showing call controls');
  xapi.Config.UserInterface.Features.HideAll.set("False");
    

}

function detectCallDisconnect(event){

  console.log (event);
  if(event != 'Disconnecting' )
    return;

  console.log('Call disconnecting, hiding the call controls');
  xapi.Config.UserInterface.Features.HideAll.set("True");
}

// Subscribe to the Call Status and send it to our custom functions
xapi.Status.Call.AnswerState.on(detectCallAnswered);
xapi.Status.Call.Status.on(detectCallDisconnect);