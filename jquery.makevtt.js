(function($){
/**
 * Make VTT File Using Ajax.
 * @param {object} opt - setting options.
 * @param {object} optCue - cue setting options.
 * @return {void}
 */
  jQuery.fn.makeVTT = function (opt, optCue) {
// set opt and optCue
    var init = {
      oAuth: null,                                     // if set this, ajax send auth=oAuth for authority variable
      wrapperId: "makeVTT",                            // first video tag is wrapped div element with this id
      playbackRate: ["1.0"],                           // playbackRate option
      defaultVolume: 1.0,                              // default volume value
      trackIdPrefix: "track",                          // track element id prefix
      setLanguage: {                                   // select language and video track element setting
        heading: {label: "Language", lang: ""},        // select first option with no value
//      _en: {label: "English", lang: "en"}            // video track element setting, track element id is set "trackIdPrefix + key"
      },
      selectTrack: false,                              // default track
      ajaxTimeoutReTry: 3,                             // ajax re-try times for timeout error
      ajax: {                                          // ajax default setting
        type: "post",
        contentType: false,
        processData: false,
        url: "",
        data: {},
        dataType: "jsonp",
        timeout: 10000
      }
    };
    var d = $.extend(true, init, opt);

// value of not set cueDefaultSet
    var cueDefaultSet = {                               // check every article on vtt document
      vertical: "",
      region: null,
      line: "auto",
      position: "auto",
      size: 100,
      align: "center",
      lineAlign: "start",
      positionAlign: "auto",
      snapToLines: true
    }
    if (optCue) cueDefaultSet = $.extend({}, cueDefaultSet, optCue);

// set variables
    var v = (this.length > 0) ? this[0] : false;
    var $v = (this.length > 0) ? $(this[0]) : false;
    var tracks = {};
    var selectTrack = false;
    var activeCueData = {id: "", text: "", startTime: "", endTime: ""};
    var cueListData = "";
    var editFlag = false;
    var wrap, currentTime, playSpeed, closedCaption;
    var cueName, cueMsg, cueStartBtn, cueStart, cueEndBtn, cueEnd, resetCueBtn, setCueBtn, unsetCueBtn, activeCue, cueList;
    var editVttBtn, resetVttBtn, setVttBtn, deleteVttBtn;
    var cueIds = {};
    var activeCueDataOrg = {};
    var vttFirstLine = "WEBVTT - This file has cues.";
    var confirmMsg = "This action cannot be undone.\nDo you want to continue?";
    var vttSaveMsg = "VTT file contents is fixed auto.\nSave fixed VTT contents, push OK.\nCheck VTT contents, push Cancel.";
    var vttAlertMsg = "VTT file format error exists!";
    var cueSetOptFlag = true;
    var debugMode = false;

/** 
 * Create and set DOM, track elements, video controlls, form elements.
 * @param {void}
 * @return {void}
 */
    var setDOM = function () {
      var wrapper = $("<div />").attr({id: d.wrapperId});
      $v.wrap(wrapper);
      wrap = $("#" + d.wrapperId);
// set video controlls
      var videoControlls = $("<div />").addClass("videoControlls");
      var currentTimeHeading = " Current Time ";
      currentTime = $("<input />").attr({type: "text", value: "00:00:00.000"}).addClass("currentTime");
      var playSpeedHeading = " ";
      if (d.playbackRate.length > 1) {
        playSpeed = $("<select />").addClass("playSpeed");
        for (var i = 0; i < d.playbackRate.length; i++) {
          var playSpeedOption = $("<option />");
          playSpeedOption.attr({value: d.playbackRate[i]}).text("x " + d.playbackRate[i]);
          if (d.playbackRate[i] === "1.0") playSpeedOption.prop("selected", true);
          playSpeed.append(playSpeedOption);
        }
        playSpeedHeading = " Play Speed ";
      }
      var closedCaptionHeading = " Closed Caption ";
      closedCaption = $("<select />").addClass("closedCaption setLanguage");
      if (Object.keys(d.setLanguage).length) {
        $.each(d.setLanguage, function(key, value) {
          var closedCaptionOption = $("<option />");
          if (value.lang === "") {
            closedCaptionOption.attr({value: "", "data-track": ""}).text(value.label);
            if (!d.selectTrack) closedCaptionOption.prop("selected", true);
          } else {
            var trackId = d.trackIdPrefix + key;
            closedCaptionOption.attr({value: value.lang, "data-track": trackId}).text(value.label);
            var trackFile = v.src.replace(/(\.[a-z\d]+)$/i, "") + key + ".vtt";
            var trackElm = $("<track />").attr({id: trackId, kind: "captions", label: value.label, srclang: value.lang, src: trackFile});
            $v.append(trackElm);
          }
          closedCaption.append(closedCaptionOption);
        });
      }
      videoControlls.append(currentTimeHeading, currentTime, playSpeedHeading, playSpeed, closedCaptionHeading, closedCaption);
      wrap.append(videoControlls);
// set tracks data
      for (var i = 0; i < v.textTracks.length; i++) {
        if (!v.textTracks[i].id) v.textTracks[i].id = $("track").eq(i).attr("id"); // for IE and Edge
        tracks[v.textTracks[i].id] = v.textTracks[i];
      }
// set vtt controlls
      var vttControlls = $("<div />").addClass("vttControlls").hide();
      cueName = $("<span />").addClass("cueName");
      cueMsg = $("<span />").addClass("cueMsg");
      var cueHead = $("<p />").addClass("cueHead").append("Cue identifier", cueName, cueMsg);
      var activeCueHeading = $("<p />").text("Active Cue ").addClass("activeCueControlls");
      cueStartBtn = $("<span />").attr({"data-set": "cueStart"}).addClass("btn setCurrentTime").text("Start");
      cueStart = $("<input />").attr({type: "text", name: "cueStart", value: ""}).addClass("readyActiveCue cueStart");
      cueEndBtn = $("<span />").attr({"data-set": "cueEnd"}).addClass("btn setCurrentTime").text("End");
      cueEnd = $("<input />").attr({type: "text", name: "cueEnd", value: ""}).addClass("readyActiveCue cueEnd");
      resetCueBtn = $("<span />").addClass("btn resetCue").text("Reset").hide();
      setCueBtn = $("<span />").addClass("btn setCue").text("Set Cue").hide();
      unsetCueBtn = $("<span />").addClass("btn unsetCue").text("Unset Cue").hide();
      activeCueHeading.append(cueStartBtn, cueStart, cueEndBtn, cueEnd, resetCueBtn, setCueBtn, unsetCueBtn);
      activeCue = $("<textarea />").attr({name: "activeCue", rows: 10}).addClass("readyActiveCue");
      var vttHeading = $("<p />").text("VTT File ").addClass("cueListControlls");
      editVttBtn = $("<span />").addClass("btn editVtt").text("Edit VTT");
      resetVttBtn = $("<span />").addClass("btn resetVtt").text("Reset VTT").hide();
      setVttBtn = $("<span />").addClass("btn setVtt").text("Set VTT").hide();
      deleteVttBtn = $("<span />").addClass("btn deleteVtt").text("Delete VTT").hide();
      vttHeading.append(editVttBtn, resetVttBtn, setVttBtn, deleteVttBtn);
      cueList = $("<textarea />").attr({name: "vtt", rows: 30, readonly: "readonly"}).addClass("cueList");
// set cueLoading and vttLoading
      var loadingText = $("<span />").text("Loading ...").wrap("<div />");
      var loadingDiv = $("<div />").addClass("nowLoading").append(loadingText);
      var cueLoading = $("<div />").addClass("cueLoading");
      var vttLoading = $("<div />").addClass("vttLoading");
      cueLoading.append(activeCue, loadingDiv.clone());
      vttLoading.append(cueList, loadingDiv.clone());
      vttControlls.append(cueHead, activeCueHeading, cueLoading, vttHeading, vttLoading);
      wrap.append(vttControlls);
      setCueBtn.hide();
      resetCueBtn.hide();
      unsetCueBtn.hide();
    };

/** 
 * Event bind function.
 * @param {void}
 * @return {void}
 */
    var setAction = function () {
// current time action
      $v.on("timeupdate", timeUpdate);
// cueStartBtn cueEndBtn action
      $(".setCurrentTime").on("click", setCurrentTime);
// keyup currentTime, video seeked action (set video currentTime)
      currentTime.on("keyup", updateCurrentTime);
      $v.on("seeked", updateCurrentTime);
// focus currentTime action (pause video)
      currentTime.on("focus", function () { v.pause(); });
// change play speed action
      $(".playSpeed").on("change", function () { v.playbackRate = $(this).val(); });
// set default volume
      v.volume = d.defaultVolume;
// Ready Input Active Cue and Edit Mode Check Method
      $(".readyActiveCue").on("keyup focus blur", readyActiveCue);
// setCueBtn action 
      setCueBtn.on("click", setActiveCue);
// unsetCueBtn action 
      unsetCueBtn.on("click", unsetActiveCue);
// resetCueBtn action 
      resetCueBtn.on("click", resetActiveCue);
// editVttBtn action 
      editVttBtn.on("click", editVtt);
// setVttBtn action 
      setVttBtn.on("click", setVtt);
// resetVttBtn action 
      resetVttBtn.on("click", resetVtt);
// deleteVttBtn action 
      deleteVttBtn.on("click", deleteVtt);
// closedCaption change action 
      closedCaption.on("change", setLanguage);
// video-cc change action
      if (isEventSupported("onchange", v.textTracks)) {
        v.textTracks.onchange = videoCCChange;
      } else {
        $("track").one("load", videoCCChangeWrapper);
        $("track").one("error", videoCCChangeWrapperError);
      }
// for first loading
      if (d.selectTrack) closedCaption.find("option[data-track='" + d.trackIdPrefix + d.selectTrack + "']").prop("selected", true);
      setTimeout(setLanguage, 1000);
    };

/** 
 * Browser event support check function.
 * @param {string} eventName - check event
 * @param {object} dom - check dom object
 * @return {boolean}
 */
  var isEventSupported = function (eventName, dom) {
    var isSupported = (eventName in dom);
    return (isSupported) ? true : false;
  };

/** 
 * Wrapper of videoCCChange for IE and Edge which has not supported video.textTracks.onchange event.
 * @param {void}
 * @return {void}
 */
  var videoCCChangeWrapper = function () {
    videoCCChange();
    $("track").off("load");
    $("track").map(function () {
      var src = $(this).attr("src").replace(/\?t=\d+$/, "") + "?t=" + (new Date()).getTime();
      $(this).attr({src: src});
    });
    setTimeout(function () { $("track").one("load", videoCCChangeWrapper); }, 500);
  };

/** 
 * Wrapper of videoCCChange on error for IE and Edge which has not supported video.textTracks.onchange event.
 * @param {void}
 * @return {void}
 */
  var videoCCChangeWrapperError = function () {
    videoCCChange();
    $("track").off("error");
    $("track").map(function () {
      var src = $(this).attr("src").replace(/\?t=\d+$/, "") + "?t=" + (new Date()).getTime();
      $(this).attr({src: src});
    });
    setTimeout(function () { $("track").one("error", videoCCChangeWrapperError); }, 500);
  };

/** 
 * Select track(cc) function.
 * @param {void}
 * @return {void}
 */
    var setLanguage = function () {
      selectTrack = closedCaption.find("option:selected").attr("data-track");
      for (var i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = (v.textTracks[i].id === selectTrack) ? "showing" : "disabled";
      }
    };

/** 
 * TextTrack change (video CC change) event action of video object.
 * @param {void}
 * @return {void}
 */
    var videoCCChange = function () {
// reset readyActiveCue block, editFlag, btn
      cueIds = {};
      editFlag = false;
      cueName.text("");
      setCueBtn.hide();
      resetCueBtn.hide();
      cueList.attr({readonly: "readonly"}).removeClass("editNow");
      setVttBtn.hide();
      resetVttBtn.hide();
      deleteVttBtn.hide();
      cueStart.removeAttr("readonly").val("");
      cueEnd.removeAttr("readonly").val("");
      activeCue.removeAttr("readonly").val("");
      editVttBtn.css({opacity: 1.0}).off("click").on("click", editVtt);
      $(".readyActiveCue").removeClass("editNow").off("keyup focus blur").on("keyup focus blur", readyActiveCue);
      $(".setCurrentTime").css({opacity: 1.0}).off("click").on("click", setCurrentTime);
      unsetCueBtn.css({opacity: 1.0}).off("click").on("click", unsetActiveCue);
// Set data and loading action
      $.when(vttLoading(".vttLoading"), vttLoading(".cueLoading")).then(function () {
        var activeFlag = false;
        for (var i = 0; i < v.textTracks.length; i++) {
          if (v.textTracks[i].mode === "showing") {
            selectTrack = v.textTracks[i].id;
            activeFlag = true;
            $("#" + selectTrack).on("cuechange", getActiveCue);
          } else {
            $("#" + v.textTracks[i].id).off("cuechange");
          }
        }
        if (!activeFlag) selectTrack = false;
        if (activeFlag && closedCaption.find("option:selected").attr("data-track") !== selectTrack) {
          closedCaption.find("option").removeAttr("selected").prop("selected", false);
          closedCaption.find("option[data-track='" + selectTrack + "']").attr("selected", "selected").prop("selected", true);;
        }
        if (!activeFlag && closedCaption.find("option:selected").attr("data-track")) {
          closedCaption.find("option").removeAttr("selected").prop("selected", false);
        }
        vttFirstLine = "WEBVTT - " + closedCaption.find("option:selected").text();
// set cue from selected track
        if (selectTrack) {
          var trackUrl = $("#" + selectTrack).attr("src");
          $.get(trackUrl).done(function() { deleteVttBtn.show(); }).fail(function(s) { deleteVttBtn.hide(); });
          cuesFromTrackElement();
          getActiveCue().then(function () {
            $(".vttControlls").show();
            vttLoaded(".vttLoading");
            vttLoaded(".cueLoading");
          }).catch(function (e) { console.log(e); });
        } else {
          cueList.val("");
          $(".vttControlls").hide();
          vttLoaded(".vttLoading");
          vttLoaded(".cueLoading");
        }
      }).catch(function (e) { console.log(e); });
    };

/** 
 * Get a textTrack object through the video element. (UNUSED)
 * @param {void}
 * @return {void}
 */
    var cuesFromVideoElement = function (){
      for (var i = 0; i < v.textTracks.length; i++) {
        var oTextTrack = v.textTracks[i];
        if (oTextTrack) getCues(oTextTrack);
      }
    };

/** 
 * Get a textTrack object through the track element.
 * @param {void}
 * @return {void}
 */
    var cuesFromTrackElement = function () {
      var oTextTrack = tracks[selectTrack];
      if (oTextTrack) getCues(oTextTrack);
    };

/** 
 * Get cue content from a textTrack object and sort cue with id number.
 * @param {object} oTextTrack - textTrack object
 * @return {void}
 */
    var getCues = function (oTextTrack){
      var oCues = oTextTrack.cues;
      var cueListVal = vttFirstLine + "\n\n";
      cueIds = {};
      if (isEventSupported("onchange", v.textTracks)) {
        for (var i = 0; i < oCues.length; i++) {
          var theCue = oCues[i];
          theCue.id = theCue.id.replace(/[\d]+/g, i + 1);
          cueIds[theCue.id] = theCue;
          cueListVal += theCue.id + "\n";
          cueListVal += cueSettingLine(theCue);
          cueListVal += theCue.text + "\n\n";
        }
        cueList.val(cueListVal);
      }
    };

/** 
 * Get active cue data from selected textTrack object.
 * @param {void}
 * @return {object} defer.promise() - promise object
 */
    var getActiveCue = function () {
      var defer = $.Deferred();
      var oTextTrack = (selectTrack) ? tracks[selectTrack] : false;
      var oActiveCues = (oTextTrack) ? oTextTrack.activeCues : false;
      if (!editFlag && oActiveCues) {
        if (oActiveCues.length > 0) {
          activeCueData = oActiveCues[0];
          unsetCueBtn.fadeIn();
        } else {
          activeCueData = {id: "", text: "", startTime: "", endTime: ""};
          unsetCueBtn.hide();
        }
        cueName.text(activeCueData.id);
        (activeCueData.startTime !== "") ? cueStart.val(timeFormat(activeCueData.startTime)) : cueStart.val("");
        (activeCueData.endTime !== "") ? cueEnd.val(timeFormat(activeCueData.endTime)) : cueEnd.val("");
// Unescape activeCueData
        activeCue.val(vttUnescape(activeCueData.text));
      } else {
        activeCueData = (oActiveCues) ? oActiveCues[0] : {id: "", text: "", startTime: "", endTime: ""};
      }
      defer.resolve();
      return defer.promise();
    };

/** 
 * Click action of setCueBtn.
 * @param {void}
 * @return {void}
 */
    var setActiveCue = function () {
      v.pause();
      var cueNameText = cueName.text().replace(/^([\d]+|NEW) ?.*/, "$1");
      var cueStartVal = cueStart.val();
      var cueEndVal = cueEnd.val();
      var activeCueVal = activeCue.val().replace(/^[ \r\n\t\f]+/, "").replace(/[ \r\n\t\f]+$/, "").replace(/[\n]{2,}/g, "\n");
// Escape activeCueVal
      activeCueVal = vttEscape(activeCueVal);
      if (cueStartVal && cueEndVal && activeCueVal && cueStartVal < cueEndVal) {
        cueNameText = cueNameText.replace(/^NEW/, Object.keys(cueIds).length + 1);
        if (cueIds[cueNameText]) {
          activeCueDataOrg = {id: cueIds[cueNameText].id, text: cueIds[cueNameText].text, startTime: cueIds[cueNameText].startTime, endTime: cueIds[cueNameText].endTime};
          cueIds[cueNameText] = $.extend({}, cueIds[cueNameText], {id: cueNameText, text: activeCueVal, startTime: timeUnformat(cueStartVal), endTime: timeUnformat(cueEndVal)});
        } else {
          activeCueDataOrg = {id: "", text: "", startTime: "", endTime: ""};
          var newCue = new VTTCue(timeUnformat(cueStart.val()), timeUnformat(cueEnd.val()), activeCueVal);
          cueIds[cueNameText] = $.extend({}, newCue, cueDefaultSet);
          cueIds[cueNameText].id = cueNameText;
        }
        var cueListVal = vttFirstLine + "\n\n";
        if (Object.keys(cueIds).length) {
          $.each(cueIds, function (key, value) {
            var theCue = value;
            cueListVal += theCue.id + "\n";
            cueListVal += cueSettingLine(theCue);
            cueListVal += theCue.text + "\n\n";
          });
        }
        cueList.val(cueListVal);
        ajaxVTT("set");
      } else {
        alert("Error Exists");
      }
    };

/** 
 * Click action of unsetCueBtn.
 * @param {void}
 * @return {void}
 */
    var unsetActiveCue = function () {
      v.pause();
      var cueNameText = cueName.text().replace(/^([\d]+) ?.*/, "$1");
      if (window.confirm(confirmMsg)) {
        if (cueIds[cueNameText]) {
          var cueListVal = vttFirstLine + "\n\n";
          if (Object.keys(cueIds).length) {
            $.each(cueIds, function (key, value) {
              var theCue = value;
              if (theCue.id != cueNameText) {
                cueListVal += theCue.id + "\n";
                cueListVal += cueSettingLine(theCue);
                cueListVal += theCue.text + "\n\n";
              }
            });
          }
          cueList.val(cueListVal);
          ajaxVTT("unset");
        } else {
          alert("Error Exists");
        }
      }
    };

/** 
 * Click action of resetCueBtn.
 * @param {void}
 * @return {void}
 */
    var resetActiveCue = function () {
      cueName.text("");
      activeCue.val("");
      cueStart.val("");
      cueEnd.val("");
      $(".readyActiveCue.editNow").removeClass("editNow");
      vttLoading(".cueLoading").then(function () {
        editFlag = false;
        var defer = $.Deferred();
        $.when(vttLoaded(".cueLoading"), getActiveCue()).then(function () { defer.resolve(); });
        return defer.promise();
      }).then(function () {
        setCueBtn.hide();
        resetCueBtn.hide();
        cueList.attr({readonly: "readonly"});
        editVttBtn.css({opacity: 1.0}).off("click").on("click", editVtt);
      }).catch(function (e) {
        editFlag = true;
        console.log(e);
      });
    };

/** 
 * Click action of editVttBtn.
 * @param {void}
 * @return {void}
 */
    var editVtt = function () {
      editVttBtn.off("click", editVtt);
      cueListData = cueList.val();
      cueList.removeAttr("readonly").addClass("editNow");
      setVttBtn.fadeIn();
      resetVttBtn.fadeIn();
      cueStart.attr({readonly: "readonly"});
      cueEnd.attr({readonly: "readonly"});
      activeCue.attr({readonly: "readonly"});
      $(".setCurrentTime").css({opacity: 0.5}).off("click");
      unsetCueBtn.css({opacity: 0.5}).off("click");
      $(".readyActiveCue").off("keyup focus blur");
    };

/** 
 * Click action of setVttBtn.
 * @param {void}
 * @return {void}
 */
    var setVtt = function () {
      var cueListVal = cueList.val().replace(/^[ \r\n\t\f]+/, "").replace(/[ \r\n\t\f]+$/, "").replace(/^WEBVTT.*\n\n/, "");
      var cueSettingLines = cueListVal.match(/.+\n\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*\n/g) || [];
      var cueTexts = cueListVal.split(/.+\n\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*\n/).slice(1) || [];
      if (cueSettingLines.length === cueTexts.length && cueSettingLines.length > 0) {
        cueListVal = vttFirstLine + "\n\n";
        for (var i = 0; i < cueTexts.length; i++) {
          cueTexts[i] = cueTexts[i].replace(/^[ \r\n\t\f]+/, "").replace(/[ \r\n\t\f]+$/, "").replace(/[\n]{2,}/g, "\n");
          if (cueTexts[i]) {
            cueSettingLines[i] = cueSettingLines[i].replace(/^[ \r\n\t\f]+/, "").replace(/[ \r\n\t\f]+$/, "");
            var match = cueSettingLines[i].match(/^(.+\n\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3})(.*)$/);
            if (match) {
              cueListVal += match[1];
              var vttCueSet = {};
              match[2].split(" ").map(function (val) {
                if (val.length) {
                  var cueSet = val.split(":");
                  if (cueSet.length === 2 && cueSet[0].match(/^vertical|region|line|position|size|align$/)) {
                    vttCueSet[cueSet[0]] = cueSet[1];
                  }
                }
              });
              if (!vttCueSet["vertical"] || !vttCueSet["vertical"].match(/^lr|rl$/)) vttCueSet["vertical"] = cueDefaultSet.vertical;
              if (!vttCueSet["region"] || !vttCueSet["region"].length) vttCueSet["region"] = cueDefaultSet.region;
              if (!vttCueSet["line"] || !vttCueSet["line"].match(/^\d+%?|auto$/)) {
                vttCueSet["line"] = (cueDefaultSet.line === "auto" || cueDefaultSet.snapToLines) ? cueDefaultSet.line : cueDefaultSet.line + "%";
              }
              if (!vttCueSet["position"] || !vttCueSet["position"].match(/^\d+%|auto$/)) {
                vttCueSet["position"] = (cueDefaultSet.position === "auto") ? cueDefaultSet.position : cueDefaultSet.position + "%";
              }
              if (!vttCueSet["size"] || !vttCueSet["size"].match(/^\d+%$/)) vttCueSet["size"] = cueDefaultSet.size + "%";
              if (!vttCueSet["align"] || !vttCueSet["align"].match(/^start|end|left|right$/)) vttCueSet["align"] = cueDefaultSet.align;
            }
            if (vttCueSet["vertical"]) cueListVal += " vertical:" + vttCueSet["vertical"];
            if (vttCueSet["region"]) cueListVal += " region:" + vttCueSet["region"];
            cueListVal += " line:" + vttCueSet["line"] + " position:" + vttCueSet["position"] + " size:" + vttCueSet["size"] + " align:" + vttCueSet["align"] + "\n";
            cueListVal += cueTexts[i].replace(/-->/g, "--&gt;") + "\n\n";
          }
        }
        cueList.val(cueListVal);
        setTimeout(function () { if (window.confirm(vttSaveMsg)) ajaxVTT("vtt"); }, 100);
      } else {
        alert(vttAlertMsg);
      }
    };

/** 
 * Click action of resetVttBtn.
 * @param {void}
 * @return {void}
 */
    var resetVtt = function () {
      vttLoading(".vttLoading").then(function () {
        var defer = $.Deferred();
        cueList.attr({readonly: "readonly"}).removeClass("editNow");
        editVttBtn.css({opacity: 1.0}).off("click").on("click", editVtt);
        $(".readyActiveCue").off("keyup focus blur").on("keyup focus blur", readyActiveCue);
        setVttBtn.hide();
        resetVttBtn.hide();
        cueStart.removeAttr("readonly");
        cueEnd.removeAttr("readonly");
        activeCue.removeAttr("readonly");
        $(".setCurrentTime").css({opacity: 1.0}).off("click").on("click", setCurrentTime);
        unsetCueBtn.css({opacity: 1.0}).off("click").on("click", unsetActiveCue);
        cueList.val(cueListData);
        defer.resolve();
        return defer.promise();
      }).then(function () {
        vttLoaded(".vttLoading");
      }).catch(function (e) { console.log(e); });
    };

/** 
 * Click action of deleteVttBtn.
 * @param {void}
 * @return {void}
 */
    var deleteVtt = function () {
      v.pause();
      var cueNameText = cueName.text();
      if (window.confirm(confirmMsg)) {
        cueList.val("");
        ajaxVTT("delete");
      }
    };

/** 
 * Timeupdate event action of video object.
 * @param {void}
 * @return {void}
 */
    var timeUpdate = function () {
      var cTime = timeFormat(this.currentTime);
      currentTime.val(cTime);
    };

/** 
 * Click action of cueStartBtn and cueEndBtn, set current time to input field.
 * @param {void}
 * @return {void}
 */
    var setCurrentTime = function (e) {
      v.pause();
      var cTime = timeFormat(v.currentTime);
      currentTime.val(cTime);
      var name = $(this).attr("data-set");
      $("input." + name).val(cTime).trigger("keyup");
    };

/** 
 * Current time update action, current time field on keyup event.
 * @param {object} event - event object
 * @return {void}
 */
    var updateCurrentTime = function (event) {
      var cTime = currentTime.val();
      var src, trackElm, lang;
      if (cTime.match(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)) {
        if (event.type === "keyup") v.currentTime = timeUnformat(cTime);
        if (selectTrack) getActiveCue();
      }
    };

/** 
 * .readyActiveCue field (.cueStart, .cueEnd, .activeCue) on keyup, focus, blur event.
 * @param {void}
 * @return {void}
 */
    var readyActiveCue = function () {
      var cueStartVal = cueStart.val();
      var cueEndVal = cueEnd.val();
      var activeCueVal = activeCue.val().replace(/^[ \r\n\t\f]+/, "").replace(/[ \r\n\t\f]+$/, "").replace(/[\n]{2,}/g, "\n");
      var cueTimeFormat = (cueStartVal.match(/^\d{2}:\d{2}:\d{2}\.\d{3}$/) && cueEndVal.match(/^\d{2}:\d{2}:\d{2}\.\d{3}$/)) ? true : false;
      if (cueStartVal && cueEndVal && cueTimeFormat && cueStartVal < cueEndVal) {
        if (activeCueVal === vttUnescape(activeCueData.text) && cueStartVal === timeFormat(activeCueData.startTime) && cueEndVal === timeFormat(activeCueData.endTime)) {
          setCueBtn.hide();
          (activeCue.val() !== vttUnescape(activeCueData.text)) ? resetCueBtn.show() : resetCueBtn.hide();
        } else {
          (activeCueVal.replace(/[\n]{2,}/g, "\n").replace(/\n$/, "").length) ? setCueBtn.fadeIn() : setCueBtn.hide();
          resetCueBtn.fadeIn();
        }
      } else {
        setCueBtn.hide();
        if (!editFlag) resetCueBtn.hide();
      }
      if (activeCueVal && activeCueVal === vttUnescape(activeCueData.text) && cueStartVal === timeFormat(activeCueData.startTime) && cueEndVal === timeFormat(activeCueData.endTime)) {
        $(".readyActiveCue").removeClass("editNow");
        editFlag = false;
        editVttBtn.css({opacity: 1.0}).off("click").on("click", editVtt);
      } else {
        if ((cueStartVal || cueEndVal || activeCueVal.replace(/^[ \r\n\t\f]+$/, "")) && !editFlag) {
          if (!cueName.text()) cueName.text("NEW");
          $(".readyActiveCue").addClass("editNow");
          editFlag = true;
          resetCueBtn.fadeIn();
          cueList.attr({readonly: "readonly"});
          editVttBtn.css({opacity: 0.5}).off("click");
        }
        if (!cueStartVal && !cueEndVal && !activeCueVal.replace(/^[ \r\n\t\f]+$/, "") && editFlag) {
          if (cueName.text() === "NEW") {
            cueName.text("");
            $(".readyActiveCue").removeClass("editNow");
            editFlag = false;
            resetCueBtn.hide();
            editVttBtn.css({opacity: 1.0}).off("click").on("click", editVtt);
          }
        }
      }
    };

/** 
 * Time format exchange from total time to hh:nn:ss.xxx.
 * @param {number} t - total time
 * @return {string} - vtt cue time format
 */
    var timeFormat = function (t) {
      var time = Math.floor(t);
      var float3 = "000" + String(Math.round(t * 1000 - time * 1000));
      float3 = "." + float3.substr(-3);
      var m = time % (60 * 60);
      var s = m % 60;
      var h = (time - m) / 60;
      m = (time - s) / 60;
      return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2) + ":" + ("0" + s).slice(-2) + float3;
    };

/** 
 * Time format exchange from hh:nn:ss.xxx to total time.
 * @param {string} t - vtt cue time format
 * @return {number} - total time
 */
    var timeUnformat = function (t) {
      var h = Number(t.substr(0, 2)) * (60 * 60);
      var m = Number(t.substr(3, 2)) * 60;
      var s = Number(t.substr(6));
      var time = h + m + s;
      return time;
    };

/** 
 * Escape character "< > &" for vtt file.
 * @param {string} string - unescaped cue text
 * @param {boolean} flag - space, quote, double quote escape flag
 * @return {string} - escaped cue text
 */
    var vttEscape = function (string, flag) {
      var flag = flag || false;
      string = string.replace(/&/g, "&amp;");
      string = string.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (flag) {
        string = string.replace(/ /g, "&nbsp;");
        string = string.replace(/'/g, "&#0*39;")
        string = string.replace(/"/g, "&quot;");
      }
      return string;
    };

/** 
 * Unescape (decode) character "< > &" from vtt file.
 * @param {string} string - escaped cue text
 * @param {boolean} flag - space, quote, double quote unescape flag
 * @return {string} - unescaped cue text
 */
    var vttUnescape = function (string, flag) {
      var flag = flag || false;
      string = string.toString().replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      string = string.replace(/&amp;/g, "&");
      if (flag) {
        string = string.replace(/&nbsp;/g, " ");
        string = string.replace(/&#0*39;|&apos;|&#x0*27;/g, "'")
        string = string.replace(/&lrm;|&rlm;/g, "")
      }
      return string;
    };

/** 
 * Make cue settings line of vtt file.
 * @param {string} theCue - cue object
 * @return {string} - line of cue start --> cue end and cue settings
 */
    var cueSettingLine = function (theCue) {
      var line = "";
      if (theCue) {
        line += timeFormat(theCue.startTime) + " --> " + timeFormat(theCue.endTime);
        if (theCue.region) line += " region:" + theCue.region;
        if (theCue.vertical && (theCue.vertical === "lr" || theCue.vertical === "rl")) line += " vertical:" + theCue.vertical;
        if (typeof theCue.line === "number" && theCue.line >= 0 && theCue.line <= 100 && !theCue.snapToLines) {
          line += " line:" + theCue.line + "%";
        } else if (typeof theCue.line === "number" && theCue.snapToLines) {
          line += " line:" + theCue.line;
        } else {
          line += " line:auto";
        }
        if (typeof theCue.position === "number" && theCue.position >= 0 && theCue.position <= 100) {
          line += " position:" + theCue.position + "%";
        } else {
          line += " position:auto";
        }
        if (typeof theCue.size === "number" && theCue.size >= 0 && theCue.size <= 100) {
          line += " size:" + theCue.size + "%";
        } else {
          line += " size:100%";
        }
        if (theCue.align === "start" || theCue.align === "end" || theCue.align === "left" || theCue.align === "right") {
          line += " align:" + theCue.align;
        } else {
          line += " align:center";
        }
        line += "\n";
      }
      return line;
    };

/** 
 * vtt data Loading display function.
 * @param {string} elmClass - .nowLoading wrap class
 * @return {object} defer.promise() - promise object
 * @return {void}
 */
    var vttLoading = function (elmClass) {
      var defer = $.Deferred();
      $(elmClass).find(".nowLoading").fadeIn(300, function () {
        defer.resolve();
      });
      return defer.promise();
    };

/** 
 * vtt data Loaded display function.
 * @param {string} elmClass - .nowLoading wrap class
 * @return {object} defer.promise() - promise object
 * @return {void}
 */
    var vttLoaded = function (elmClass) {
      var defer = $.Deferred();
      $(elmClass).find(".nowLoading").fadeOut(300, function () {
        defer.resolve();
      });
      return defer.promise();
    };

/** 
 * ajaxVTT ajax beforeSend function. (loading action)
 * @param {void}
 * @return {void}
 */
    var ajaxBeforeSend = function () { vttLoading(".vttLoading"); };

/** 
 * ajaxVTT ajax statusCode setting.
 * @param {void}
 * @return {void}
 */
    var ajaxStatusCode = {
      200: function () {},
      302: function () { cueMsg.text("Ajax error. Status code 302"); },
      404: function () { cueMsg.text("Ajax error. Status code 404"); },
      501: function () { cueMsg.text("Ajax error. Status code 501"); }
    };

/** 
 * Cue form data send with ajax.
 * @param {string} action - vtt file action, delete or other (set, unset, vtt)
 * @param {boolean} timeoutReTry - re-try times of timeout error for ajax
 * @return {void}
 */
    var ajaxVTT = function (action, timeoutReTry) {
      var crud = (action === "delete") ? "d" : "u";
      timeoutReTry = timeoutReTry || 0;
      var msg;
      var formData = new FormData();
      if (d.oAuth != null) formData.append("auth", d.oAuth);
      formData.append("media", v.src);
      formData.append("vtt", $("#" + selectTrack).attr("src").replace(/\?t=\d+$/, ""));
      formData.append("cue", cueList.val());
      formData.append("crud", crud);
      var ajaxSetting = $.extend({}, d.ajax, {beforeSend: ajaxBeforeSend, statusCode: ajaxStatusCode, data: formData});
      $.ajax(ajaxSetting).done(
        function (data, textStatus, jqXHR) { successAjaxVTT(data, action); }
      ).fail(
        function (jqXHR, textStatus, errorThrown) {
          if (textStatus === "timeout" && timeoutReTry < d.ajaxTimeoutReTry) {
            ++timeoutReTry;
            setTimeout(function () { ajaxVTT(action, timeoutReTry); }, 1000 * timeoutReTry);
          } else {
            cueMsg.text("Ajax error. errorThrown: " + errorThrown);
          }
        }
      ).always(
        function (jqXHR, textStatus) {
          cueMsg.show();
          setTimeout(function () { cueMsg.fadeOut(function () { cueMsg.removeClass("error").text(""); }); }, 3000);
          vttLoaded(".vttLoading");
        }
      );
    };

/** 
 * ajaxVTT ajax success function.
 * @param {object} data - ajaxVTT ajax response data
 * @param {boolean} action - vtt file action, delete or other (set, unset, vtt) from ajaxVTT
 * @return {void}
 */
    var successAjaxVTT = function (data, action) {
      var msg = data.msg;
      if (!data.result) {
        cueMsg.addClass("error").text(data.msg);
        activeCueData = $.extend({}, activeCueData, activeCueDataOrg);
        if (action === "vtt") {
          cueList.val(data.cue);
        } else {
          cueList.val(data.vtt_contents);
        }
        return;
      }
      if (action === "delete") {
        while (tracks[selectTrack].cues.length) {
          tracks[selectTrack].removeCue(tracks[selectTrack].cues[0]);
        }
        closedCaption.find("option").prop("selected", false);
        closedCaption.find("option").eq(0).prop("selected", true);
        closedCaption.trigger("change");
        cueList.val("");
      } else if (action === "unset") {
        var theCue = tracks[selectTrack].cues[parseInt(cueName.text(), 10) - 1];
        tracks[selectTrack].removeCue(theCue);
      } else if (cueName.text() === "NEW") {
        var newCue = activeCue.val().replace(/^[ \r\n\t\f]+/, "").replace(/[ \r\n\t\f]+$/, "").replace(/[\n]{2,}/g, "\n");
        newCue = vttEscape(newCue);
        var theCue = new VTTCue(timeUnformat(cueStart.val()), timeUnformat(cueEnd.val()), newCue);
        theCue = $.extend(theCue, cueDefaultSet);
        theCue.id = tracks[selectTrack].cues.length + 1;
        tracks[selectTrack].addCue(theCue);
      } else if (action === "vtt") {
        var cueArray = data.vtt_contents.split(/[\n]{2}/);
        if (cueArray[0].match(/^WEBVTT/)) cueArray.shift();
        while (tracks[selectTrack].cues.length) {
          tracks[selectTrack].removeCue(tracks[selectTrack].cues[0]);
        }
        for (var i = 0; i < cueArray.length; i++) {
          var match = cueArray[i].match(/^(.+)\n(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})(.*)\n([\d\D]*)$/);
          if (match) {
            var cueData = {name: match[1], start: match[2], end: match[3], text: match[5]}
            var theCue = new VTTCue(timeUnformat(cueData.start), timeUnformat(cueData.end), cueData.text);
            var vttCueSet = {};
            match[4].split(" ").map(function (val) {
              if (val.length) {
                var cueSet = val.split(":");
                if (cueSet.length === 2) {
                  if (cueSet[0] === "line" && cueSet[1].match(/^\d+|auto$/)) vttCueSet.snapToLines = true;
                  if (cueSet[0] === "line" && cueSet[1].match(/^\d+%$/)) vttCueSet.snapToLines = false;
                  cueSet[1] = String(cueSet[1]).replace(/%$/, "");
                  if (cueSet[1].match(/^\d+$/)) cueSet[1] = Number(cueSet[1]);
                  vttCueSet[cueSet[0]] = cueSet[1];
                }
              }
            });
            if (cueDefaultSet.lineAlign) vttCueSet.lineAlign = cueDefaultSet.lineAlign;
            if (cueDefaultSet.positionAlign) vttCueSet.positionAlign = cueDefaultSet.positionAlign;
            theCue = $.extend(theCue, vttCueSet);
            theCue.id = cueData.name;
            tracks[selectTrack].addCue(theCue);
          }
        }
      } else {
        var theCue = tracks[selectTrack].cues[parseInt(cueName.text(), 10) - 1];
        theCue.text = activeCue.val().replace(/^[ \r\n\t\f]+/, "").replace(/[ \r\n\t\f]+$/, "").replace(/[\n]{2,}/g, "\n");
        theCue.text = vttEscape(theCue.text);
        theCue.startTime = timeUnformat(cueStart.val());
        theCue.endTime = timeUnformat(cueEnd.val());
      }
      if (action != "delete") {
// reset action
        cueList.attr({readonly: "readonly"}).removeClass("editNow");
        editVttBtn.css({opacity: 1.0}).off("click").on("click", editVtt);
        $(".readyActiveCue").off("keyup focus blur").on("keyup focus blur", readyActiveCue);
        setVttBtn.hide();
        resetVttBtn.hide();
        cueStart.removeAttr("readonly");
        cueEnd.removeAttr("readonly");
        activeCue.removeAttr("readonly");
        $(".setCurrentTime").css({opacity: 1.0}).off("click").on("click", setCurrentTime);
        unsetCueBtn.css({opacity: 1.0}).off("click").on("click", unsetActiveCue);
// get cues
        getCues(tracks[selectTrack]); // sort cue id number
        $v.one("canplaythrough", getActiveCue);
      }
      cueMsg.text(data.msg);
      resetCueBtn.trigger("click");
    };

// Start up action
    setDOM();
    setAction();
  };
})(jQuery);
