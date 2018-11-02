# MakeVTT
This jQuery plugin is helper of making Web-VTT files of your video. This VTT file is able to use source of track element inside of video element.

## Installation
Download jquery.makevtt.js or jquery.makevtt.min.js and set your page.

### Requirement
jQuery 3.3.1 or later
PHP 5.6.38 or later
Browser Chrome, Firefox

### Compatibility
jQuery 1.12.4 or 2.2.4, set with jquery-migrate-1.4.1.
PHP 7.0.x
PHP 7.1.x
PHP 7.2.x
VTT supported browser maybe work. Not working IE and Edge, they are not supported VTT completely.

## Usage
Web-VTT file update and save using ajax and PHP.(jsonp)
Files and directory set your web server.
Load jQuery and jquery.makevtt.js, set like below on test page.
```html
<video controls type="video/mp4" src="upload/dolbycanyon.mp4"></video>
```

```javascript
<script src="js/jquery.makevtt.js"></script>
<script>
var opt = {
    setLanguage: {                                // Set label and lang of track element. Key is used track id and suffix of Web-VTT file name.
      _en: {label: "English", lang: "en"},
      _jp: {label: "Japanese", lang: "ja"}
    },
  ajax: {url: location.protocol + "//" + location.hostname + "/ajax/ajax_makevtt.php"}
                                                  // This value is option of jQuery.ajax(option). Set url for your web setting.
};
$(function(){
  $('video').makeVTT(opt);
});
</script>
```

### Options
```html
<video controls type="video/mp4" src="upload/dolbycanyon.mp4" data-auth="<?php echo $_SESSION['auth']; ?>"></video>
```

```javascript
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
```

```php
 :
// Check Authority    This sample is only session ckech. If you change check value, customize this block. Line 12-15 of ajax/ajax_makevtt.php
session_start();
$auth = (isset($_REQUEST['auth'])) ? $_REQUEST['auth'] : true;
if (!$auth || $auth != $_SESSION['auth']) $invalid_data[] = 'auth';
 :
```

## Example
Access the index.php file located in the 'example' folder on web server.
You may need to change permission of upload directory.

## License
This plugin is released under the MIT License.
