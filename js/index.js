/*jshint esversion: 6 */

const fileType = {tcx: 'tcx', csv: 'csv'};

  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }



  function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    var files = evt.dataTransfer.files; // FileList object
    var type = evt.target.id === 'tcxdropzone' ? fileType.tcx : fileType.csv;

    var summaryContainer = (type === fileType.tcx) ? document.getElementById('tcxSummaryContainer') : document.getElementById('csvSummaryContainer');
    var dataContainer = document.createElement('table');
    summaryContainer.appendChild(dataContainer);
    var currentRow = document.createElement('tr');
    if (type === fileType.tcx){
        appendCell('Timestamp', currentRow);
        appendCell('Activity', currentRow);
        appendCell('Distance', currentRow);
        appendCell('Minutes', currentRow);
        appendCell('Calories', currentRow);
        appendCell('Avg Heartrate', currentRow);
        appendCell('Min Heartrate', currentRow);
        appendCell('Max Heartrate', currentRow);
    }
    else{
        appendCell('Date', currentRow);
        appendCell('Status', currentRow);
        appendCell('Steps', currentRow);
        appendCell('Move Minutes', currentRow);
        appendCell('Active (m)', currentRow);
        appendCell('Running (m)', currentRow);
        appendCell('Walking (m)', currentRow);
        appendCell('Calories', currentRow);
        appendCell('Avg Heartrate', currentRow);
        appendCell('Min Heartrate', currentRow);
        appendCell('Max Heartrate', currentRow);
    }

    dataContainer.appendChild(currentRow);


    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {

      // Only process image files.
    //   if (!f.type.match('image.*')) {
    //     continue;
    //   }

      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {

            var summary = (type === fileType.tcx) ? getActivitySummary(e.target.result, dataContainer) : getAggregationSummary(e.target.result, theFile.name, dataContainer);
            

            if (summary != ''){
            //     // Add to summaries.
            //     var span = document.createElement('div');
            //     span.innerHTML = summary;
                summaryContainer.appendChild(dataContainer);
            }
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsText(f);
    }
  }

  // Setup the dnd listeners.
  var tcxdropzone = document.getElementById('tcxdropzone');
  tcxdropzone.addEventListener('dragover', handleDragOver, false);
  tcxdropzone.addEventListener('drop', handleFileSelect, false);
  var csvdropzone = document.getElementById('csvdropzone');
  csvdropzone.addEventListener('dragover', handleDragOver, false);
  csvdropzone.addEventListener('drop', handleFileSelect, false);

  
  function getActivitySummary(data, dataContainer){
    var dataObj = X2J.parseXml(data)[0];
    var activities = dataObj.TrainingCenterDatabase[0].Activities[0].Activity;
    var activityType;
    var distance;
    var totalTime;
    var calories;
    var totalAverageReadings;
    var averageHR;
    var maximumHR;
    var minimumHR;
    var intensity;
    var totalLaps;
    var timestamp;
    var summaries = '';
    for (let activity of activities){
        activityType = activity.Notes[0].jValue;
        totalAverageReadings = 0;
        averageHR = 0;
        maximumHR = 0;
        minimumHR = 1000;
        totalLaps = 0;
        totalTime = 0;
        calories = 0;
        distance = 0;
        for (let lap of activity.Lap)
        {
            totalLaps++;
            timestamp = lap.jAttr.StartTime;
            timestamp = timestamp.substring(0, timestamp.length - 8).replace('T', ' ');
            for (let trackpoint of lap.Track[0].Trackpoint){
                if(typeof trackpoint.HeartRateBpm != 'undefined' && typeof trackpoint.HeartRateBpm[0].Value != 'undefined'){
                    minimumHR = Math.min(minimumHR, parseFloat(trackpoint.HeartRateBpm[0].Value[0].jValue));
                }
            }
            distance = Math.max(distance, parseFloat(lap.DistanceMeters[0].jValue));
            totalTime += parseFloat(lap.TotalTimeSeconds[0].jValue);
            calories += parseFloat(lap.Calories[0].jValue);
            totalAverageReadings++;
            if(typeof lap.AverageHeartRateBpm != 'undefined' && typeof lap.AverageHeartRateBpm[0].Value != 'undefined'){
                averageHR = (averageHR + parseFloat(lap.AverageHeartRateBpm[0].Value[0].jValue));
            }
            if(typeof lap.MaximumHeartRateBpm != 'undefined' && typeof lap.MaximumHeartRateBpm[0].Value != 'undefined'){
                maximumHR = Math.max(maximumHR, parseFloat(lap.MaximumHeartRateBpm[0].Value[0].jValue));
            }

            //Todo: account for multiple intensities
            intensity = lap.Intensity[0].jValue;
        }

        averageHR = averageHR / totalAverageReadings;

        if(averageHR > 0){
            let currentRow = document.createElement('tr');
            
            appendCell(timestamp, currentRow);
            appendCell(intensity + ' ' + activityType, currentRow);
            appendCell(roundToPrecision(distance / 1000, 3), currentRow);
            appendCell(roundToPrecision(totalTime / 60, 0), currentRow);
            appendCell(roundToPrecision(calories, 0), currentRow);
            appendCell(roundToPrecision(averageHR, 0), currentRow);
            appendCell(roundToPrecision(minimumHR, 0), currentRow);
            appendCell(roundToPrecision(maximumHR, 0), currentRow);
            dataContainer.appendChild(currentRow);
        }
    }

    return true;
}

  function getAggregationSummary(data, filename, dataContainer){
    var dataObj = csvJSON(data);
    var distance = 0;
    var activeTime = 0;
    var calories = 0;
    var totalAverageReadings = 0;
    var averageHR = 0;
    var maximumHR = 0;
    var minimumHR = 1000;
    var stepCount = 0;
    var timeRunning = 0;
    var timeWalking = 0;
    var timeInactive = 0;
    var moveMinutes = 0;
    var incompleteData = false;
    for (let segment of dataObj){
        if(segment['Start time'] != '' && typeof segment['Start time'] !== 'undefined'){
            minimumHR = segment['Min heart rate (bpm)'] != '' && typeof segment['Min heart rate (bpm)'] !== 'undefined' ? Math.min(minimumHR, extractFloatFromCSV(segment['Min heart rate (bpm)'])) : minimumHR;
            maximumHR = segment['Max heart rate (bpm)'] != '' && typeof segment['Max heart rate (bpm)'] !== 'undefined' ? Math.max(maximumHR, extractFloatFromCSV(segment['Max heart rate (bpm)'])) : maximumHR;
            
            if (segment['Average heart rate (bpm)'] != ''){
                totalAverageReadings++;
                averageHR = (averageHR + extractFloatFromCSV(segment['Average heart rate (bpm)']));
            }
            distance += extractFloatFromCSV(segment['Distance (m)']);
            moveMinutes += extractFloatFromCSV(segment['Move Minutes count']);
            stepCount += extractFloatFromCSV(segment['Step count']);
            calories += extractFloatFromCSV(segment['Calories (kcal)']);
            timeInactive += extractFloatFromCSV(segment['Inactive duration (ms)']);
            timeWalking += extractFloatFromCSV(segment['Walking duration (ms)']);
            timeRunning += extractFloatFromCSV(segment['Running duration (ms)']);
            activeTime += 900000 - extractFloatFromCSV(segment['Running duration (ms)']);
            if (segment['Inactive duration (ms)'] == '' && segment['Walking duration (ms)'] == '' && segment['Running duration (ms)'] == ''){
                incompleteData = true;
            }
        }
    }
    averageHR = averageHR / totalAverageReadings;

    let currentRow = document.createElement('tr');
    appendCell(filename.substring(0, filename.length - 4), currentRow);
    appendCell(incompleteData ? 'INCOMPLETE' : 'complete', currentRow);
    appendCell(stepCount, currentRow);
    appendCell(moveMinutes, currentRow);
    appendCell(roundToPrecision((activeTime / 1000 / 60), 0), currentRow);
    appendCell(roundToPrecision((timeRunning / 1000 / 60), 0), currentRow);
    appendCell(roundToPrecision((timeWalking / 1000 / 60), 0), currentRow);
    appendCell(roundToPrecision(calories, 0), currentRow);
    appendCell(roundToPrecision(averageHR, 0), currentRow);
    appendCell(roundToPrecision(minimumHR, 0), currentRow);
    appendCell(roundToPrecision(maximumHR, 0), currentRow);
    dataContainer.appendChild(currentRow);

    return true;
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