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

            var summary = getActivitySummary(e.target.result);

          // Render thumbnail.
          var span = document.createElement('div');
          span.innerHTML = summary;
          document.getElementById('list').insertBefore(span, null);
        };
      })(f);

      // Read in the image file as a data URL.
      reader.readAsText(f);
    }
  }

  // Setup the dnd listeners.
  var dropZone = document.getElementById('dropzone');
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleFileSelect, false);


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
    var summaries = '';
    for (let activity of activities){
        activityType = activity.Notes[0].jValue;
        totalAverageReadings = 0;
        averageHR = 0;
        maximumHR = 0;
        minimumHR = 0;
        totalLaps = 0;
        totalTime = 0;
        calories = 0;
        distance = 0;
        for (let lap of activity.Lap)
        {
            totalLaps++;
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
                averageHR = (averageHR + parseFloat(lap.AverageHeartRateBpm[0].Value[0].jValue)) / totalAverageReadings;
            }
            if(typeof lap.MaximumHeartRateBpm != 'undefined' && typeof lap.MaximumHeartRateBpm[0].Value != 'undefined'){
                maximumHR = Math.max(maximumHR, parseFloat(lap.MaximumHeartRateBpm[0].Value[0].jValue));
            }

            //Todo: account for multiple intensities
            intensity = lap.Intensity[0].jValue;
        }
        summaries += '<div>' + intensity + ' ' + activityType + ': ' + roundToPrecision(distance / 1000, 3) + ' km ' + roundToPrecision(totalTime / 60, 2) + ' min ' +
        roundToPrecision(calories, 2) + ' calories - HeartRate Readings: ' + roundToPrecision(averageHR, 0) + 'avg ' + roundToPrecision(minimumHR, 0) + 'min ' + roundToPrecision(maximumHR, 0) + 'max</div>';

    }

    return summaries;
}


function roundToPrecision(num, precision) {
    return (Math.round((num + Number.EPSILON) * (10^precision)) / (10^precision)).toFixed(precision);
}