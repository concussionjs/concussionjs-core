$(document).ready(function() {
	$(".result").mouseover(function () {
		$(this).attr('id', 'active');
		$(this).focus();
	});
	$(".result").mouseout(function () {
		$(this).attr('id', '');
	});
	$(".result").focus(function () {
		$(this).attr('id', 'active');
	});
	$(".result").blur(function () {
		$(this).attr('id', '');
	});
	/*
	$("#search").mouseover(function () {
		$(this).attr('id', 'active');
		$(this).focus();
	});
	$("#search").mouseout(function () {
		$(this).attr('id', '');
	});
	$("#search").focus(function () {
		$(this).attr('id', 'active');
	});
	$("#search").blur(function () {
		$(this).attr('id', '');
	});
	*/
});
$(document).keydown(function(e) {
	//layer = window.globalVars.selectedLayer;
	switch(e.keyCode) {
		case 37:
			//moveLayer(layer, "left");
			
		break;	
		case 38:
			//moveLayer(layer, "up");
			jQuery().tabindex() = jQuery().tabindex() - 1;
		break;
		case 39:
			//moveLayer(layer, "right");
		break;
		case 40:
			//moveLayer(layer, "down");
			jQuery().tabindex() = jQuery().tabindex() + 1;
		break;
}
});
