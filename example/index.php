<?php
session_start();
if (!isset($_SESSION['auth'])) $_SESSION['auth'] = md5(uniqid().mt_rand());
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>jQuery Make VTT</title>
<meta name="keywords" content="">
<meta name="description" content="">
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
<link rel="stylesheet" href="css/jquery.makevtt.css">
</head>
<body>
<div>
<h1>jQuery Make VTT</h1>
<video controls type="video/mp4" src="upload/dolbycanyon.mp4" data-auth="<?php echo $_SESSION['auth']; ?>"></video>
</div>
<script src="js/jquery.makevtt.js"></script>
<script>
var opt = {
    oAuth: $("video").attr("data-auth"),          // Auth value on ajax. This sample is PHP session.
    playbackRate: ["0.5", "1.0", "1.5", "2.0"],   // Play speed selection.
    defaultVolume: 0.1,                           // Default volume value.
    trackIdPrefix: "track",                       // Prefix of track element id. Id is set trackIdPrefix + setLanguage key.
    setLanguage: {                                // Set label and lang of track element. Key is used track id and suffix of Web-VTT file name.
      _en: {label: "English", lang: "en"},
      _jp: {label: "Japanese", lang: "ja"}
    },
  selectTrack: "_en",                             // Default track of the key.
  ajax: {url: location.protocol + "//" + location.hostname + "/ajax/ajax_makevtt.php"}
                                                  // This value is option of jQuery.ajax(option). Set url for your web setting.
};
var optCue = {                                    // Every cue setting of Web-VTT file. Please check Web-VTT document
      line: "auto",
      position: 2,
      size: 96,
      align: "left",
      snapToLines: false
};
$(function () {
  $('video').makeVTT(opt, optCue);
});
</script>
</body>
</html>
