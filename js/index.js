/*jshint esversion: 6 */

const fileType = {tcx: 'application/tcx+xml', csv: 'text/csv'};
var filesProcessed = 0;
var filesToProcess = 0;
var tcxSummaryData = [];
var csvSummaryData = [];

  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    evt.target.classList.add('dragover');
  }

  function handleDragLeave(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.target.classList.remove('dragover');
  }

  function handleFileSelect(evt) {   
    var files = evt.dataTransfer && evt.dataTransfer.files[0].type !== '' ? evt.dataTransfer.files : evt.target.files;


    evt.target.classList.remove('dragover');
    
    filesProcessed = 0;
    filesToProcess = files.length;
    if (filesToProcess <= 0){ return true;}

    document.documentElement.style.setProperty('--progressBarDisplay', 'block');

    // Loop through the FileList
    for (var i = 0, f; f = files[i]; i++) {

      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {

            let summaryResult = (theFile.type === fileType.tcx) ? getActivitySummary(e.target.result, tcxSummaryData) : getAggregationSummary(e.target.result, theFile.name, csvSummaryData);
            handleFileProcessed();
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsText(f);
    }

    
  }

  function handleFileProcessed(){
    filesProcessed++;
    var percentComplete = filesProcessed / filesToProcess;
    document.documentElement.style.setProperty('--gradientStart', (percentComplete > 50 ? (percentComplete - 50) * 200 : 0) + '%');
    document.documentElement.style.setProperty('--gradientEnd', (percentComplete * 100) + '%');
    if(filesProcessed === filesToProcess){
        processSummaries();
    }
  }

  function processSummaries(){
    //Update Activity Reports
    var summaryContainer = document.getElementById('tcxSummaryContainer');
    while (summaryContainer.lastChild){
        summaryContainer.removeChild(summaryContainer.lastChild);
    }
    var dataContainer = document.createElement('table');
    summaryContainer.appendChild(dataContainer);
    var currentRow = document.createElement('tr');
    currentRow.classList.add('summaryHeader');
    appendCell('Timestamp', currentRow);
    appendCell('Activity', currentRow);
    appendCell('Distance (km)', currentRow);
    appendCell('Total Time', currentRow);
    appendCell('Calories', currentRow);
    appendCell('Avg Heartrate', currentRow);
    appendCell('Min Heartrate', currentRow);
    appendCell('Max Heartrate', currentRow);
    dataContainer.appendChild(currentRow);

    tcxSummaryData.sort(compareDates);

    tcxSummaryData.forEach(function(summary){
        currentRow = document.createElement('tr');
        appendCell(summary.timestamp.format('MMM D, YYYY - HH:MM'), currentRow);
        // appendCell(intensity + ' ' + activityType, currentRow);
        appendCell(summary.activityType, currentRow);
        appendCell(roundToPrecision(summary.distance / 1000, 2), currentRow);
        appendCell(formatDuration(summary.totalTime * 1000), currentRow);
        appendCell(roundToPrecision(summary.calories, 0), currentRow);
        appendCell(roundToPrecision(summary.averageHR, 0), currentRow);
        appendCell(roundToPrecision(summary.minimumHR, 0), currentRow);
        appendCell(roundToPrecision(summary.maximumHR, 0), currentRow);
        dataContainer.appendChild(currentRow);
    });



    //Update Daily Aggregations
    summaryContainer = document.getElementById('csvSummaryContainer');
    while (summaryContainer.lastChild){
        summaryContainer.removeChild(summaryContainer.lastChild);
    }
    dataContainer = document.createElement('table');
    summaryContainer.appendChild(dataContainer);
    currentRow = document.createElement('tr');
    currentRow.classList.add('summaryHeader');
    summaryContainer = document.getElementById('csvSummaryContainer');
    appendCell('Date', currentRow);
    appendCell('Status', currentRow);
    appendCell('Steps', currentRow);
    appendCell('Move Minutes', currentRow);
    appendCell('Active', currentRow);
    appendCell('Running', currentRow);
    appendCell('Walking', currentRow);
    appendCell('Calories', currentRow);
    appendCell('Avg Heartrate', currentRow);
    appendCell('Min Heartrate', currentRow);
    appendCell('Max Heartrate', currentRow);
    dataContainer.appendChild(currentRow);

    csvSummaryData.sort(compareDates);

    csvSummaryData.forEach(function(summary){
        currentRow = document.createElement('tr');
        appendCell(summary.timestamp.format('MMM D, YYYY'), currentRow);
        appendCell(summary.incompleteData ? 'INCOMPLETE' : 'complete', currentRow);
        appendCell(summary.stepCount, currentRow);
        appendCell(summary.moveMinutes, currentRow);
        appendCell(formatDuration(summary.activeTime), currentRow);
        appendCell(formatDuration(summary.timeRunning), currentRow);
        appendCell(formatDuration(summary.timeWalking), currentRow);
        appendCell(roundToPrecision(summary.calories, 0), currentRow);
        appendCell(roundToPrecision(summary.averageHR, 0), currentRow);
        appendCell(roundToPrecision(summary.minimumHR, 0), currentRow);
        appendCell(roundToPrecision(summary.maximumHR, 0), currentRow);
        dataContainer.appendChild(currentRow);
    });
  }

    //Hide progress bar for now
    document.documentElement.style.setProperty('--progressBarDisplay', 'none');
    // Setup the dropzone listeners.
    var tcxdropzone = document.getElementById('tcxdropzone');
    tcxdropzone.addEventListener('dragover', handleDragOver, false);
    tcxdropzone.addEventListener('dragleave', handleDragLeave, false);
    tcxdropzone.addEventListener('drop', handleFileSelect, false);
    tcxdropzone.addEventListener('change', handleFileSelect, false);

  
  function getActivitySummary(data, tcxSummaryData){
    var dataObj = X2J.parseXml(data)[0];
    var activities = dataObj.TrainingCenterDatabase[0].Activities[0].Activity;
    for (let activity of activities){
        let currentActivity = {
            activityType: activity.Notes[0].jValue,
            averageHR: 0,
            maximumHR: 0,
            minimumHR: 1000,
            totalTime: 0,
            calories: 0,
            distance: 0,
        };
        let totalAverageReadings = 0;
        for (let lap of activity.Lap)
        {
            currentActivity.timestamp = moment(lap.jAttr.StartTime);
            for (let trackpoint of lap.Track[0].Trackpoint){
                if(typeof trackpoint.HeartRateBpm != 'undefined' && typeof trackpoint.HeartRateBpm[0].Value != 'undefined'){
                    currentActivity.minimumHR = Math.min(currentActivity.minimumHR, parseFloat(trackpoint.HeartRateBpm[0].Value[0].jValue));
                }
            }
            currentActivity.distance = lap.DistanceMeters ? Math.max(currentActivity.distance, parseFloat(lap.DistanceMeters[0].jValue)) : 0;
            currentActivity.totalTime += parseFloat(lap.TotalTimeSeconds[0].jValue);
            currentActivity.calories += typeof lap.Calories !== 'undefined' ? parseFloat(lap.Calories[0].jValue) : 0;
            totalAverageReadings++;
            if(typeof lap.AverageHeartRateBpm != 'undefined' && typeof lap.AverageHeartRateBpm[0].Value != 'undefined'){
                currentActivity.averageHR = (currentActivity.averageHR + parseFloat(lap.AverageHeartRateBpm[0].Value[0].jValue));
            }
            if(typeof lap.MaximumHeartRateBpm != 'undefined' && typeof lap.MaximumHeartRateBpm[0].Value != 'undefined'){
                currentActivity.maximumHR = Math.max(currentActivity.maximumHR, parseFloat(lap.MaximumHeartRateBpm[0].Value[0].jValue));
            }

            //Todo: account for multiple intensities
            currentActivity.intensity = lap.Intensity[0].jValue;
        }

        currentActivity.averageHR = currentActivity.averageHR / totalAverageReadings;

        if(currentActivity.averageHR > 0){
            tcxSummaryData.push(currentActivity);
        }
        return tcxSummaryData;
    }

    return false;
}

  function getAggregationSummary(data, filename, csvSummaryData){
    var dataObj = csvJSON(data);
    var result = {
        timestamp: moment(filename.substring(0, filename.length - 4)),
        distance: 0,
        activeTime: 0,
        calories: 0,
        averageHR: 0,
        maximumHR: 0,
        minimumHR: 1000,
        stepCount: 0,
        timeRunning: 0,
        timeWalking: 0,
        timeInactive: 0,
        moveMinutes: 0,
        incompleteData: false,
    };
    var totalAverageReadings = 0;
    for (let segment of dataObj){
        if(segment['Start time'] != '' && typeof segment['Start time'] !== 'undefined'){
            result.minimumHR = segment['Min heart rate (bpm)'] != '' && typeof segment['Min heart rate (bpm)'] !== 'undefined' ? Math.min(result.minimumHR, extractFloatFromCSV(segment['Min heart rate (bpm)'])) : result.minimumHR;
            result.maximumHR = segment['Max heart rate (bpm)'] != '' && typeof segment['Max heart rate (bpm)'] !== 'undefined' ? Math.max(result.maximumHR, extractFloatFromCSV(segment['Max heart rate (bpm)'])) : result.maximumHR;
            
            if (segment['Average heart rate (bpm)'] != ''){
                totalAverageReadings++;
                result.averageHR = (result.averageHR + extractFloatFromCSV(segment['Average heart rate (bpm)']));
            }
            result.distance += extractFloatFromCSV(segment['Distance (m)']);
            result.moveMinutes += extractFloatFromCSV(segment['Move Minutes count']);
            result.stepCount += extractFloatFromCSV(segment['Step count']);
            result.calories += extractFloatFromCSV(segment['Calories (kcal)']);
            result.timeInactive += extractFloatFromCSV(segment['Inactive duration (ms)']);
            result.timeWalking += extractFloatFromCSV(segment['Walking duration (ms)']);
            result.timeRunning += extractFloatFromCSV(segment['Running duration (ms)']);
            result.activeTime += 900000 - extractFloatFromCSV(segment['Running duration (ms)']);
            if (segment['Inactive duration (ms)'] == '' && segment['Walking duration (ms)'] == '' && segment['Running duration (ms)'] == ''){
                result.incompleteData = true;
            }
        }
    }
    result.averageHR = result.averageHR / totalAverageReadings;

    if(totalAverageReadings > 0 && result.averageHR > 0){
        csvSummaryData.push(result);
        return csvSummaryData;
    }
    return null;
}


function roundToPrecision(num, precision) {
    return (Math.round((num + Number.EPSILON) * (10^precision)) / (10^precision)).toFixed(precision);
}

function extractFloatFromCSV(inputValue){
    if(typeof inputValue === 'undefined' || inputValue == ''){
        return 0;
    }
    else{
        return parseFloat(inputValue);
    }
}

function appendCell(cellValue, parent){
    var cell = document.createElement('td');
    cell.innerHTML = cellValue;
    parent.appendChild(cell);
}

function formatDuration(milliseconds){
    return moment.utc(moment.duration(milliseconds).as('milliseconds')).format('H[h] mm[m]');
}

function compareDates(a, b){
    const dateA = moment(a.timestamp);
    const dateB = moment(b.timestamp);

    let comparison = 0;
    if (dateA.isBefore(dateB)){
        comparison = 1;
    }
    else if (dateB.isBefore(dateA)){
        comparison = -1;
    }
    return comparison;
}