function showTestCanvas()
{
	//alert("Test canvas Button was pressed");
	var table = document.getElementById("displayTable");
	table.style.display = "none";
	var canvas = document.getElementById("testCanvas");
	canvas.style.display = "block";
	var ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function hideTestCanvas()
{
	var table = document.getElementById("displayTable");
	table.style.display = "block";
	var canvas = document.getElementById("testCanvas");
	canvas.style.display = "none";
}

function drawRectangle()
{
	var table = document.getElementById("displayTable");
	table.style.display = "none";
	var canvas = document.getElementById("testCanvas");
	canvas.style.display = "block";
	var ctx = canvas.getContext("2d");
	ctx.fillStyle = "#FF0000";
	ctx.fillRect(0, 0, 150, 75);
}