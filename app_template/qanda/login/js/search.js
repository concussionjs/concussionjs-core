function clearSearchDefault() {
	search.focus();
	search.className = "searchFocus";
	if (search.defaultValue==search.value) {
		search.value = "";
	}	
}

function clearSearch() {
	search.focus();	
	search.className = "searchFocus";
	search.value = "";
	$('#search').keyup();
}

function clearSearchMouseOver() {
	document.body.style.cursor = "pointer";
}

function clearSearchMouseOut() {
	document.body.style.cursor = "default";
}

function searchBlur() {
	search.className = "searchBlur";
	if (search.value == "") {
		search.value = "Search for an answer...";
	}	
}

function callback() {
	$('#search').change();
}

