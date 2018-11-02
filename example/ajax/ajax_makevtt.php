<?php
// Ajax Response Ready
$json_data = array();
$msg = '';
$result = false;
$filepath = __FILE__;
$path_info = pathinfo($filepath);
$upload_dir = $path_info['dirname'] . '/../upload/';
$invalid_data = [];
$debug_mode = false;

// Check Authority    This sample is only session ckech. If you change check value, customize this block.
session_start();
$auth = (isset($_REQUEST['auth'])) ? $_REQUEST['auth'] : true;
if (!$auth || $auth != $_SESSION['auth']) $invalid_data[] = 'auth';

// Post data    $_POST['media'], $_POST['vtt'], $_POST['cue'], $_POST['crud']
$media_filename = (isset($_REQUEST['media'])) ? pathinfo($_REQUEST['media'], PATHINFO_BASENAME) : '';
$vtt_filename = (isset($_REQUEST['vtt'])) ? pathinfo($_REQUEST['vtt'], PATHINFO_BASENAME) : '';
$vtt_contents = (isset($_REQUEST['cue'])) ? $_REQUEST['cue'] : '';
$crud = (isset($_REQUEST['crud'])) ? $_REQUEST['crud'] : '';

// Set Mandatory Data and Check    $media_filename, $vtt_filename, $vtt_contents, $crud
if (!file_exists($upload_dir . $media_filename)) $invalid_data[] = 'media';
if (!preg_match('/.+\.vtt$/i', $vtt_filename)) $invalid_data[] = 'vtt';
if (strpos($vtt_contents, 'WEBVTT') != 0 && $vtt_contents != '') $invalid_data[] = 'cue';
if ($crud != 'c' && $crud != 'r' && $crud != 'u' && $crud != 'd') $invalid_data[] = 'crud';

if (!empty($invalid_data)) {
	$error_msg = 'Post Data Error! Not saved!';
// Get VTT File Data
	$vtt_contents = (file_exists($upload_dir . $vtt_filename)) ? file_get_contents($upload_dir . $vtt_filename) : '';
} elseif ($crud === 'd') {
// Delete VTT File
	$result = (file_exists($upload_dir. $vtt_filename)) ? unlink($upload_dir. $vtt_filename) : false;
	$error_msg = 'Delete ' . $vtt_filename . ' Failed.';
	$success_msg = 'Delete ' . $vtt_filename . ' Success.';
	$vtt_contents = ($result) ? '' : $vtt_contents;
} elseif ($crud === 'c' || $crud === 'u') {
// Create or Update VTT File
	// Sort
	$vtt_contents_array = preg_split('/(\r?\n){2,}/', $vtt_contents);
	$vttFirstLine = (strpos($vtt_contents_array[0], 'WEBVTT') === 0) ? $vtt_contents_array[0] : 'WEBVTT';
	$vtt_cue = array();
	$pattern = '/^(\d+)\r?\n/';
	foreach ($vtt_contents_array as $val) {
		if (preg_match($pattern, $val, $matches)) $vtt_cue[] = preg_replace('/^\d+/', '', $val);
	}
	sort($vtt_cue);
	array_unshift($vtt_cue, $vttFirstLine);
	foreach ($vtt_cue as $key => $value) {
		$value = preg_replace('/[\r]*/', '', $value);
		if ($key !== 0) $vtt_cue[$key] = $key . $value;
	}
	$vtt_contents = implode("\n\n", $vtt_cue);
	$override_flag = (file_exists($upload_dir. $vtt_filename)) ? true : false;
	$result = file_put_contents($upload_dir . $vtt_filename, $vtt_contents);
	$error_msg = 'Save ' . $vtt_filename . ' Failed.';
	$success_msg = ($override_flag) ? 'Save ' . $vtt_filename . ' Success.' : 'Save New ' . $vtt_filename . ' Success.';
} elseif ($crud === 'r') {
// Get VTT File Data
	if (file_exists($upload_dir . $vtt_filename)) {
		$vtt_contents = file_get_contents($upload_dir . $vtt_filename);
		$result = true;
	} else {
		$vtt_contents = '';
		$result = false;
	}
	$error_msg = 'Read ' . $vtt_filename . ' Failed.';
	$success_msg = 'Read ' . $vtt_filename . ' Success.';
} else {
	$error_msg = 'Error!';
}

// Json Response Data
$msg = ($result) ? $success_msg : $error_msg;
$json_data = array(
				'msg' => $msg, 
				'media_filename' => $media_filename, 
				'vtt_filename' => $vtt_filename, 
				'vtt_contents' => $vtt_contents, 
				'crud' => $crud, 
				'result' => $result, 
			);
if (isset($_REQUEST['media'])) $json_data['media'] = $_REQUEST['media'];
if (isset($_REQUEST['vtt'])) $json_data['vtt'] = $_REQUEST['vtt'];
if (isset($_REQUEST['cue'])) $json_data['cue'] = $_REQUEST['cue'];
if ($debug_mode) {
	$json_data['invalid'] = $invalid_data;
	if ($auth) $json_data['auth'] = $auth . ' : ' . $_SESSION['auth'];
}
$callback = ($_GET['callback']) ? $_GET['callback'] : false;
header("Content-Type: application/json; charset=UTF-8");
header("X-Content-Type-Options: nosniff");
$die_msg = 'bad or missing callback';
if (empty($_SERVER['HTTP_X_REQUESTED_WITH']) || $_SERVER['HTTP_X_REQUESTED_WITH'] !== 'XMLHttpRequest') die($die_msg);
if (!$callback || preg_match("/[^_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789]/", $callback)) die($die_msg);
echo $callback . '(' . json_encode($json_data) . ')';

exit;
