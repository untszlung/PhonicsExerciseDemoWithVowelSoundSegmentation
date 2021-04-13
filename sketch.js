wordlist = [

  ['BOG', ['b', 'o', 'g']],
  ['BAD', ['b', 'a', 'd']],
  ['DOG', ['d', 'o', 'g']],
  ['DAG', ['d', 'a', 'g']],
  ['POT', ['p', 'o', 't']],
  ['DISH', ['d', 'i', 'sh']],
  ['SHIP', ['sh', 'i', 'p']],
  ['SHEEP', ['sh', 'ee', 'p']],
  ['SHUT', ['sh', 'u', 't']],
  ['SUN', ['s', 'u', 'n']],
  ['BUS', ['b', 'u', 's']]
];

vowelSoundList = ['a','o','i','ee','u'];

// 3 speakers training data
//const URL = "https://teachablemachine.withgoogle.com/models/E1cMzu4nQ/";

//miss lam data
const URL = "https://teachablemachine.withgoogle.com/models/RhDcUFCz3/";

let recognizer;
let classLabels;
let IsRecongnizing = false;
let accuminatedPhonicsResults = [];
let phonciesResultCount = 1;

let result_history = "";
let resultHistoryCount =  0;
let PreviewPhonicsResult = '';

let sortedTop3TempPhonicsResults = '';
let sortTopPhonicsResultList = [];


let sortTopPhonicsResults = "";
let promptStatus = "";
let sortPhonicsResults = "";

let startConsonantPhonicsSegmentText = "";
let vowelPhonicsSegmentText = "";
let endConsonantPhonicsSegmentText = "";

let startConsonantPhonicsSegmentList = [];
let vowelPhonicsSegmentList = [];
let endConsonantPhonicsSegmentList = [];

let isShowDigestedResults;
let isShowRawResults;

let currentWordIndex = 0;
let isCurrentWordFinish = true;

let phonemeIndex = 0;



let minPhnoicsRecognitionIteration = 1;
let overlapFactor =0.9;
let maxTopKPhonicsResult = 6;
let backgroundNoiseCount = 1;
let backgroundNoiseThershold = 3;

async function createModel() {
  const checkpointURL = URL + "model.json"; // model topology
  const metadataURL = URL + "metadata.json"; // model metadata

  console.log('model loading');
  promptStatus = 'phonics model loading ...';
  
  const recognizer = speechCommands.create(
    "BROWSER_FFT", // fourier transform type, not useful to change
    undefined, // speech commands vocabulary feature, not useful for your models
    checkpointURL,
    metadataURL);

 // console.log("model loaded");
  // check that model and metadata are loaded via HTTPS requests.
  await recognizer.ensureModelLoaded();

  return recognizer;
}

async function init() {
  recognizer = await createModel();
  classLabels = recognizer.wordLabels(); // get class labels
  //console.log(recognizer.modelInputShape());



  // listen() takes two arguments:
  // 1. A callback function that is invoked anytime a word is recognized.
  // 2. A configuration object with adjustable fields
  //startListening();
  console.log('Press Mic on to say');
   promptStatus = 'Press [Mic on] to say\nPress [Next word] for blending next word';
  // Stop the recognition in 5 seconds.
  // setTimeout(() => recognizer.stopListening(), 5000);
}



function getVowelSound(blendingWord){
  for (let i = 0; i < blendingWord.length; i++) {
    for (let j=0; j < vowelSoundList.length; j++){
        if (blendingWord[i] == vowelSoundList[j] ){
          return vowelSoundList[j];
        }
    }
     
  }  
}

function getSelectedPhonicsSegment(phonicsResults,soundStartIndex,soundEndIndex){
    let selectedPhonicSegment = [];
    for (let i =soundStartIndex; i<soundEndIndex; i++)
    {
      //console.log(accuminatedPhonicsResults[(3*i)][0]);
      selectedPhonicSegment.push([phonicsResults[(3*i)][0],phonicsResults[(3*i)][1]]); 
      selectedPhonicSegment.push([phonicsResults[(3*i)+1][0],phonicsResults[(3*i)+1][1]]); 
      selectedPhonicSegment.push([phonicsResults[(3*i)+2][0],phonicsResults[(3*i)+2][1]]); 
    }
  
  return selectedPhonicSegment;
  
  
}

function startListening() {
  recognizer.listen(result => {
    //const scores = result.scores; // probability of prediction for each class
    // render the probability scores per class

    let myMap = [];


    //Sort the recognized result
    for (let i = 0; i < classLabels.length; i++) {
      const classPrediction = classLabels[i] + ": " + result.scores[i].toFixed(2);


      myMap.push([classLabels[i], result.scores[i].toFixed(2) * 100]);
    }
    const phonicsResults = myMap.sort((a, b) => b[1] - a[1]);



    let label = '[';
    for (let i = 0; i < 3; i++) {
      label = label + `${phonicsResults[i][0]}(${phonicsResults[i][1].toFixed(0)})%, `;
      if ((phonicsResults[0][0] != 'Background Noise') && (phonicsResults[0][0] != 'unknown')) {



        accuminatedPhonicsResults.push([phonicsResults[i][0], phonicsResults[i][1].toFixed(0)]);
        //console.log('accuminatedPhonicsResults: ' + accuminatedPhonicsResults);

        //console.log(i + ': ' + refinedPhonicsResultsMap);
      }
    }
    label = label + ']';



    if ((phonicsResults[0][0] != 'Background Noise') && (phonicsResults[0][0] != 'unknown')) {
      result_history =  result_history + resultHistoryCount + '. ' + label + '\n';
      resultHistoryCount++;

    }


    // check ending point of the utterance
    if (IsRecongnizing == false) {
      if ((PreviewPhonicsResult == 'Background Noise') && (phonicsResults[0][0] != 'Background Noise')) {
        IsRecongnizing = true;
      }

    } else {
      if (phonicsResults[0][0] == 'Background Noise') {
        
      
        console.log('backgroundNoiseCount: ' + backgroundNoiseCount);
        
        console.log('result_history:' + result_history);
          backgroundNoiseCount++
        if (backgroundNoiseCount > backgroundNoiseThershold){
          backgroundNoiseCount = 1;
          
          //stop mic
          stopListening();
        
          if (result_history != '') {

          //console.log('accuminatedPhonicsResults.length: ' + accuminatedPhonicsResults.length / 3);
          //if(accuminatedPhonicsResults.length >= phonicsResultsSamplingWindowSize * 3){
          //let countPhonicsResultList = [];

          // let sortPhonicsResultList = [];
          //sortTopPhonicsResultList = [];
            
            
            
           //get vowel sound of current word
          let vowelSound = getVowelSound(wordlist[currentWordIndex][1]);
            
          console.log('vowelSound: ' + vowelSound);

          //search vowel sound position from a result
          let vowelSoundStartIndex = 0;
          let vowelSoundEndIndex =accuminatedPhonicsResults.length/3;
          
          let isCheckingVowelSound = false;
          let vowelSoundEndPos = 0;
          // phoncs segmentation from result
          for (let i=0; i<accuminatedPhonicsResults.length; i=i+3){
            let isCheckingEndVowelSound = true;
            for (let j=0; j<3; j++){
              //check vowel sound 
                // console.log(`accuminatedPhonicsResults[(${i})+${j}][0] = ${accuminatedPhonicsResults[(i)+j][0]}`);
              if(accuminatedPhonicsResults[i+j][0] == vowelSound){
             
                if(isCheckingVowelSound == false){
                  isCheckingVowelSound = true;
                  vowelSoundStartIndex = i/3;
                  console.log('vowelSoundStartIndex - i: '+ vowelSoundStartIndex + ' j: ' + j + ' (' + accuminatedPhonicsResults[(vowelSoundStartIndex)+j][1]+ ')');
                  vowelSoundEndPos = j;
              
                  //break;
                }  
                isCheckingEndVowelSound = false;
              }
            }
            
            if ((isCheckingVowelSound == true) && (isCheckingEndVowelSound == true)){
              isCheckingVowelSound = false;
              isCheckingEndVowelSound = false;
              vowelSoundEndIndex = i/3;
              console.log('vowelSoundEndIndex - i: '+ vowelSoundEndIndex + ' j: ' + vowelSoundEndPos+ ' (' + accuminatedPhonicsResults[(vowelSoundStartIndex)+vowelSoundEndPos][1]+ ')');
              break;
                  
            }  
            
          }
            
            
            
          // get the best result of each segmented phonics
            let vowelPhonicsSegment = [];
            let startConsonantPhonicsSegment = [];
            let endConsonantPhonicsSegment = [];
            
            vowelPhonicsSegment = getSelectedPhonicsSegment(accuminatedPhonicsResults,vowelSoundStartIndex,vowelSoundEndIndex);
            startConsonantPhonicsSegment = getSelectedPhonicsSegment(accuminatedPhonicsResults,0,vowelSoundStartIndex);
            endConsonantPhonicsSegment = getSelectedPhonicsSegment(accuminatedPhonicsResults,vowelSoundEndIndex,accuminatedPhonicsResults.length/3);
            
            console.log(`startConsonantPhonicsSegment: ${startConsonantPhonicsSegment}`);
            console.log(`vowelPhonicsSegment: ${vowelPhonicsSegment}`);
            console.log(`endConsonantPhonicsSegment: ${endConsonantPhonicsSegment}`);
            
            
            
            startConsonantPhonicsSegmentList = sortPhonicsResult(startConsonantPhonicsSegment, startConsonantPhonicsSegment.length / 3);
            vowelPhonicsSegmentList = sortPhonicsResult(vowelPhonicsSegment, vowelPhonicsSegment.length / 3);
            endConsonantPhonicsSegmentList = sortPhonicsResult(endConsonantPhonicsSegment, endConsonantPhonicsSegment.length / 3);
            
            startConsonantPhonicsSegmentText = convertResultArrayToText(startConsonantPhonicsSegmentList);
            vowelPhonicsSegmentText = convertResultArrayToText(vowelPhonicsSegmentList);
            endConsonantPhonicsSegmentText = convertResultArrayToText(endConsonantPhonicsSegmentList);
            
            console.log(`startConsonantPhonicsSegmentText: ${startConsonantPhonicsSegmentText}`);
            console.log(`vowelPhonicsSegmentText: ${vowelPhonicsSegmentText}`);
            console.log(`endConsonantPhonicsSegmentText: ${endConsonantPhonicsSegmentText}`);
            
          //sorted the phonics result
          //sortPhonicsResultList = sortPhonicsResult(accuminatedPhonicsResults, accuminatedPhonicsResults.length / 3);
          //console.log(`sortPhonicsResultList: ${sortPhonicsResultList}`);
          // sortPhonicsResults = "";

          //console.log('sortPhonicsResultList.length: ' + sortPhonicsResultList.length);

          
          

          
//           for (let i = 0; i < sortPhonicsResultList.length; i++) {
//             if ((sortPhonicsResultList[i][2] >= minPhnoicsRecognitionIteration) && ((sortPhonicsResultList[i][0] != 'Background Noise') && (sortPhonicsResultList[i][0] != 'unknown'))) {
//               // sortPhonicsResults = sortPhonicsResults + `${sortPhonicsResultList[i][0]}(${sortPhonicsResultList[i][1]}%)(${sortPhonicsResultList[i][2]}), `;
//               sortTopPhonicsResultList.push([sortPhonicsResultList[i][0], sortPhonicsResultList[i][1], sortPhonicsResultList[i][2]]);
//             }
//           }

//           sortTopPhonicsResultList = sortTopPhonicsResultList.sort((a, b) => b[1] - a[1]);

//           //show finalize result, 
//           sortTopPhonicsResults = "";
//           let maxTopKPhonicsResultCount = 0;
//           if (sortTopPhonicsResultList.length > maxTopKPhonicsResult) {
//             maxTopKPhonicsResultCount = maxTopKPhonicsResult;
//           } else {
//             maxTopKPhonicsResultCount = sortTopPhonicsResultList.length;
//           }
//           for (let i = 0; i < maxTopKPhonicsResultCount; i++) {
//             //if (sortTopPhonicsResultList[i][2] >= 3){
//             sortTopPhonicsResults = sortTopPhonicsResults + `${sortTopPhonicsResultList[i][0]}(${sortTopPhonicsResultList[i][1]}%)(${sortTopPhonicsResultList[i][2]}),   `;

//             //}
//           }


//           if (maxTopKPhonicsResultCount > 0) {
           
//              console.log(`${phonciesResultCount}. sortTopPhonicsResults:  ${sortTopPhonicsResults}`)
//              sortTopPhonicsResults = `${phonciesResultCount}. ${sortTopPhonicsResults}`;
//             phonciesResultCount++;
           
      
//           }


    

//           //show a results by counting and sorting of recognized phonics
//           for (let i = 0; i < sortPhonicsResultList.length; i++) {
//             sortPhonicsResults = sortPhonicsResults + `${sortPhonicsResultList[i][0]}(${sortPhonicsResultList[i][1]}%)(${sortPhonicsResultList[i][2]}), `;
//           }
//           console.log(`--sortPhonicsResults: ${sortPhonicsResults}`);
         
      
          //console.log("result history:" + result_history);
        

          //result_history = '';
          IsRecongnizing = false;

          accuminatedPhonicsResults = [];
        }
        }



      }

    }

    PreviewPhonicsResult = phonicsResults[0][0];
   
  }, {
    includeSpectrogram: true, // in case listen should return result.spectrogram
    probabilityThreshold: 0.10,
    invokeCallbackOnNoiseAndUnknown: false,
    overlapFactor: `${overlapFactor}` // probably want between 0.5 and 0.75. More info in README
  });

}

function stopListening() {
  recognizer.stopListening();
  promptStatus = 'press [Mic on] to say';
}

function convertResultArrayToText(InputResultArray){
  let outputResultText = '';
  
   //show finalize result, 
    //sortTopPhonicsResults = "";
    let maxTopKPhonicsResultCount = 0;
    if (InputResultArray.length > maxTopKPhonicsResult) {
      maxTopKPhonicsResultCount = maxTopKPhonicsResult;
    } else {
      maxTopKPhonicsResultCount = InputResultArray.length;
    }
    for (let i = 0; i < maxTopKPhonicsResultCount; i++) {
      //if (sortTopPhonicsResultList[i][2] >= 3){
      outputResultText = outputResultText + `${InputResultArray[i][0]}(${InputResultArray[i][1]}%)(${InputResultArray[i][2]}),   `;

      //}
    }

  
  return outputResultText;
}

function sortPhonicsResult(InputPhonicsResults, phonicsResultsSamplingWindowSize) {
  // sample the phoncis results by sliding windows
  // let phonicsResultsSamplingWindowSize = 1;
  let accuminatedPhonicsResultThershold = 3;
  let offset = 0;
  let tempphonicsResultsCount = 1;
  let OutputPhonicsResult = [];
  let  sortedTempPhonicsResults = [];
  sortTopPhonicsResultList = [];


  if (InputPhonicsResults.length >= phonicsResultsSamplingWindowSize * 3) {
    //count all recongized phonics result by sliding windows
    for (let j = 0; j <= ((InputPhonicsResults.length - phonicsResultsSamplingWindowSize * 3)); j = j + 3) {
      //let countPhonicsResultList = [];
      let tempphonicsResults = [];
      for (let k = 0; k < phonicsResultsSamplingWindowSize * 3; k++) {
        let isResultExist = false;

        // count the recongized phonices result
        for (let i = 0; i < tempphonicsResults.length; i++) {


          //if the result already exist , compare and update highet confident score
          if (tempphonicsResults[i][0] == InputPhonicsResults[k + offset][0]) {
            //console.log(`-${tempphonicsResults[i][0]}${tempphonicsResults[i][1]}   == ${InputPhonicsResults[k+offset][0]}${InputPhonicsResults[k+offset][1]} k:${k} offset:${offset} tempphonicsResults: ${tempphonicsResults}`);  
            if (InputPhonicsResults[k + offset][1] - tempphonicsResults[i][1] > 0) {

              //console.log(`--${tempphonicsResults[i][0]}${tempphonicsResults[i][1]}   == ${InputPhonicsResults[k+offset][0]}${InputPhonicsResults[k+offset][1]} k:${k} offset:${offset} tempphonicsResults: ${tempphonicsResults}`);         
              tempphonicsResults[i][1] = InputPhonicsResults[k + offset][1];

            }
            tempphonicsResults[i][2]++;
            isResultExist = true;
            break;

          }
        }

        //add to a phonics result if it doesn't exist
        if (isResultExist == false) {
          // console.log(`InputPhonicsResults[k+offset][0]:${InputPhonicsResults[k+offset][0]} k:${k} offset:${offset}`);

          tempphonicsResults.push([InputPhonicsResults[k + offset][0], InputPhonicsResults[k + offset][1], 1]);
        }
      }

      //sort the count of phonics result
      sortedTempPhonicsResults = tempphonicsResults.sort((a, b) => b[2] - a[2]);

     // OutputPhonicsResult = sortedTempPhonicsResults;
       sortedTop3TempPhonicsResults = '';

      //Get the top 3 confident score result
      // for (let m = 0; m < 3; m++) {
      //   sortedTop3TempPhonicsResults = sortedTop3TempPhonicsResults + `${sortedTempPhonicsResults[m][0]}(${sortedTempPhonicsResults[m][1]}%)(${sortedTempPhonicsResults[m][2]}), `;
      // }
      
     // console.log(`${tempphonicsResultsCount}. ${sortedTop3TempPhonicsResults}`);
      tempphonicsResultsCount++;
      offset = offset + 3;
    }
  }

  //console.log(`OutputPhonicsResult.length: ${OutputPhonicsResult.length}`);
  // return OutputPhonicsResult;
  for (let i = 0; i < sortedTempPhonicsResults.length; i++) {
            if ((sortedTempPhonicsResults[i][2] >= minPhnoicsRecognitionIteration) && ((sortedTempPhonicsResults[i][0] != 'Background Noise') && (sortedTempPhonicsResults[i][0] != 'unknown'))) {
              // sortPhonicsResults = sortPhonicsResults + `${sortedTempPhonicsResults[i][0]}(${sortedTempPhonicsResults[i][1]}%)(${sortedTempPhonicsResults[i][2]}), `;
              sortTopPhonicsResultList.push([sortedTempPhonicsResults[i][0], sortedTempPhonicsResults[i][1], sortedTempPhonicsResults[i][2]]);
            }
          }

          sortTopPhonicsResultList = sortTopPhonicsResultList.sort((a, b) => b[1] - a[1]);

//           //show finalize result, 
//           sortTopPhonicsResults = "";
          let maxTopKPhonicsResultCount = 0;
          let selectedTopPhonicsResultList = [];
          if (sortTopPhonicsResultList.length > maxTopKPhonicsResult) {
            maxTopKPhonicsResultCount = maxTopKPhonicsResult;
          } else {
            maxTopKPhonicsResultCount = sortTopPhonicsResultList.length;
          }
          for (let i = 0; i < maxTopKPhonicsResultCount; i++) {
            selectedTopPhonicsResultList.push([sortTopPhonicsResultList[i][0], sortTopPhonicsResultList[i][1], sortTopPhonicsResultList[i][2]]);
            //if (sortTopPhonicsResultList[i][2] >= 3){
            // sortTopPhonicsResults = sortTopPhonicsResults + `${sortTopPhonicsResultList[i][0]}(${sortTopPhonicsResultList[i][1]}%)(${sortTopPhonicsResultList[i][2]}),   `;

            //}
          }


//           if (maxTopKPhonicsResultCount > 0) {
           
//              console.log(`${phonciesResultCount}. sortTopPhonicsResults:  ${sortTopPhonicsResults}`);
//              sortTopPhonicsResults = `${phonciesResultCount}. ${sortTopPhonicsResults}`;
//             phonciesResultCount++;
           
      
//           }


    

          //show a results by counting and sorting of recognized phonics
        // sortPhonicsResults = "";
        //   for (let i = 0; i < sortedTempPhonicsResults.length; i++) {
        //     sortPhonicsResults = sortPhonicsResults + `${sortedTempPhonicsResults[i][0]}(${sortedTempPhonicsResults[i][1]}%)(${sortPhonicsResultList[i][2]}), `;
        //   }
        //   console.log(`--sortPhonicsResults: ${sortPhonicsResults}`);
     OutputPhonicsResult = selectedTopPhonicsResultList;
    return OutputPhonicsResult;
}

function setup() {
  //Initialise the recognizer
  init();

  createCanvas(windowWidth, windowHeight-100);


  //checkbox = createCheckbox('Mic ON/OFF', true);
  //checkbox.changed(micONOFF);

  //checkbox1 = createCheckbox('Digested Results', false);
  //checkbox1.changed(showDigestedResults);
  isShowDigestedResults = false;

  checkbox2 = createCheckbox('Raw Results', false);
   checkbox2.position(0,  windowHeight-80);
  checkbox2.changed(showRawResults);
  isShowRawResults = false;
  
  startPhonicsBendingbutton = createButton('Mic on');
  
  startPhonicsBendingbutton.position(windowWidth/2, windowHeight-80);
  startPhonicsBendingbutton.mousePressed(startPhonicsBending);
  
  nextWordbutton = createButton('Next word');
  nextWordbutton.position(windowWidth-100, windowHeight-80);
  nextWordbutton.mousePressed(changeNextWord);
}

function startPhonicsBending(){
  startListening();
  result_history = '';
  resultHistoryCount = 0;
   promptStatus = 'start listening ...';
  //document.getElementById("startPhonicsBendingbutton").name="recording";
  startPhonicsBendingbutton.name = 'recording';
}

function changeNextWord(){
    if(1<wordlist.length-currentWordIndex){
             currentWordIndex++;
             phonemeIndex=0;
          }
          else{
            currentWordIndex=0;
            phonemeIndex=0;
          }
  
  startConsonantPhonicsSegmentList = [];
  vowelPhonicsSegmentList = [];
  endConsonantPhonicsSegmentList = [];
}

function micONOFF() {
  if (this.checked()) {
    console.log('mic on');
    startListening();
  } else {
    console.log('mic off');
    stopListening();
  }
}

function showDigestedResults() {
  if (this.checked()) {
    isShowDigestedResults = true;
    console.log('enable digested results');
    
  } else {
    isShowDigestedResults = false;
    console.log('disable digested results');
  }
}

function showRawResults() {
  if (this.checked()) {
    isShowRawResults = true;
    console.log('enable digested results');
    
  } else {
    isShowRawResults = false;
    console.log('disable digested results');
  }
}

function draw() {
  background(255);

  var red = [255, 0, 0];
  var black = [0,0,0];
 
  


  
//   if(isCurrentWordFinish == true){

//     //match the recoginzed result
  
//     for (let i=0;i<sortTopPhonicsResultList.length;i++){
//       if (sortTopPhonicsResultList[i][0] == wordlist[currentWordIndex][1][phonemeIndex]){
//      //   console.log(`sortTopPhonicsResultList[${i}][0] = ${sortTopPhonicsResultList[i][0]} wordlist[${currentWordIndex}][1][${phonemeIndex}]=${wordlist[currentWordIndex][1][phonemeIndex]}`);
      
//         phonemeIndex++;
//         break;
       
//       }
//     }
//   }
  
  //
  textSize(80);
 
    var pos_x = (width - textWidth(wordlist[currentWordIndex][0]))/2;

    fill( black );
  text(wordlist[currentWordIndex][0], pos_x, 100);

  
  
  textSize(40);

 
  let wordPhonincs = '';
  
  //find the text width of blending sound
  for (let i = 0; i < wordlist[currentWordIndex][1].length; i++) {
    wordPhonincs = wordPhonincs + `{${wordlist[currentWordIndex][1][i]}}`;
    if (wordlist[currentWordIndex][1].length != i + 1) {
      wordPhonincs = wordPhonincs + ' ';
    }
  }
 
//    push();
//   var pos_x = (width - textWidth(wordPhonincs))/2;
//   for (let i = 0; i < wordlist[currentWordIndex][1].length; i++) {
    
  
//      var w = textWidth(`{${wordlist[currentWordIndex][1][i]}} `);
        
      
//      // if (i!=phonemeIndex){
//           fill( black );
          
//      // }else{
//       //    fill( red );
//       //}
      
//      text( `{${wordlist[currentWordIndex][1][i]}}`, pos_x, 150);
//     pos_x += w;
//   }
//   pop();
  
  
  // Display the matching result
  push();
  pos_x = (width - textWidth(wordPhonincs))/2;
    for (let i = 0; i < wordlist[currentWordIndex][1].length; i++) {
    
  
     var w = textWidth(`{${wordlist[currentWordIndex][1][i]}} `);
      if (i ==0){
        for(let j=0;j<startConsonantPhonicsSegmentList.length;j++){

          if (startConsonantPhonicsSegmentList[j][0] == wordlist[currentWordIndex][1][i]){
                     
            fill( red );
            break;
          }
          else{
              fill( black );
          }
         
        }
        
      }
      if (i ==1){
        for(let j=0;j<vowelPhonicsSegmentList.length;j++){
          if (vowelPhonicsSegmentList[j][0] == wordlist[currentWordIndex][1][i]){
            fill( red );
            
            break;
          
          }
          else{
              fill( black );
          }
          
        }
        
      }
         if (i ==2){
        for(let j=0;j<endConsonantPhonicsSegmentList.length;j++){
          if (endConsonantPhonicsSegmentList[j][0] == wordlist[currentWordIndex][1][i]){
            fill( red );
            break;
          }
          else{
              fill( black );
          }
      
        }
        
      }
      
      text( `{${wordlist[currentWordIndex][1][i]}}`, pos_x, 150);
      pos_x += w;

  }
  pop();
   
  //pos_x = (width - textWidth(wordPhonincs))/2;
  //text(wordPhonincs, pos_x, 150);
  
  push();
  textAlign(CENTER);
  textSize(20);

  text(promptStatus, 10, 180, width-20);
  
  text(`{${wordlist[currentWordIndex][1][0]}} - ${startConsonantPhonicsSegmentText}`, 10, 240, width-20);
  text(`{${wordlist[currentWordIndex][1][1]}} - ${vowelPhonicsSegmentText}`, 10, 300, width-20);
  text(`{${wordlist[currentWordIndex][1][2]}} - ${endConsonantPhonicsSegmentText}`, 10, 360, width-20);
 

  
  textSize(12);

  if (isShowDigestedResults == true){
    if(sortPhonicsResults != ''){
      text('<disgested results>', 10, 250, width-20);
      text(sortPhonicsResults, 10, 265, width-20);
    }
  }
  
  if (isShowRawResults == true){
    if (result_history!= ''){
    text('<raw results>', 10, 430, width-20);
    text(result_history, 10, 440, width-20);
    }
  }
  pop();
  
  //check the ending phonics of current word
   if(wordlist[currentWordIndex][1].length==phonemeIndex){
     console.log(`wordlist[currentWordIndex][1].length=${wordlist[currentWordIndex][1].length} phonemeIndex=${phonemeIndex}`);
           console.log(`currentWordIndex: ${currentWordIndex} wordlist.length-1=${wordlist.length-1}`);
          if(1<wordlist.length-currentWordIndex){
             currentWordIndex++;
             phonemeIndex=0;
          }
          else{
            currentWordIndex=0;
            phonemeIndex=0;
          }
    }
  
  sortTopPhonicsResultList = [];
  //sortedTop3TempPhonicsResults=[];

}
