/*jshint esversion: 6 */

  function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }



  function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    var files = evt.dataTransfer.files; // FileList object

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

            var summary = theFile.name.substring(theFile.name.length - 3) === 'tcx' ? getActivitySummary(e.target.result) : getAggregationSummary(e.target.result, theFile.name);

            if (summary != ''){
                // Add to summaries.
                var span = document.createElement('div');
                span.innerHTML = summary;
                document.getElementById('list').insertBefore(span, null);
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

  
  function getActivitySummary(data){
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
            summaries += '<div>Timestamp: ' + timestamp + ' - ' + intensity + ' ' + activityType + ': ' + roundToPrecision(distance / 1000, 3) + ' km ' + roundToPrecision(totalTime / 60, 0) + ' min ' +
            roundToPrecision(calories, 0) + ' calories - HeartRate Readings: ' + roundToPrecision(averageHR, 0) + 'avg ' + roundToPrecision(minimumHR, 0) + 'min ' + roundToPrecision(maximumHR, 0) + 'max</div>';
        }
    }

    return summaries;
}

  function getAggregationSummary(data, filename){
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

    return '<div>Date: ' + filename.substring(0, filename.length - 4) + (incompleteData ? ' (INCOMPLETE)' : '') + ' - ' + stepCount + ' steps ' + moveMinutes + ' move minutes ' + roundToPrecision((activeTime / 1000 / 60), 0) + ' minutes active ' + roundToPrecision((timeRunning / 1000 / 60), 0) + ' minutes running ' + roundToPrecision((timeWalking / 1000 / 60), 0) + ' minutes walking ' +
    roundToPrecision(calories, 0) + ' calories - HeartRate Readings: ' + roundToPrecision(averageHR, 0) + 'avg ' + roundToPrecision(minimumHR, 0) + 'min ' + roundToPrecision(maximumHR, 0) + 'max</div>';
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