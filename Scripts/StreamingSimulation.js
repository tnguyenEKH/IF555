var IpCamSnap = 'http://10.0.5.26:8880/action/snap?cam=0&user=admin&pwd=12345';
var IpCamStream = 'http://10.0.5.26:8880/action/stream?subject=mjpeg&user=admin&pwd=12345';


$(document).ready(function () {
    var nIntervID;
    //function innerhalb setInterval soll keine Parameter und Rückgabewerten besitzen

});

/************Get Snapshot from IP-Kamera*************************************/

function getImage(Url) {
    var res;
    $.ajax({
        type: "POST",
        url: "WebServiceEK.asmx/getImageIPCam",
        data: "{Url: '" + Url + "'}",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        async: false, // wichtig! sonst kein Rückgabewert
        success: function (response) {
            res = response.d;
            log("requestImage ok");
            //res = r;
        },
        complete: function (xhr, status) {
            log("requestImage complete");
        },
        error: function (msg) {
            log("requestImage fail: " + msg);
        }
    });
    return res;
}

/*
Image will be load every second to simulate video streaming
No parameter was passed and no return value coz setInterval requirement
*/
function simVideoStream() {
    var imgBox1 = document.getElementById('ImgBox1');
    var imgBox2 = document.getElementById('ImgBox2');
    var image = 'data:image/png;base64,' + getImage(IpCamSnap);
    ImgBox1.src = image;
    //ImgBox2.src = image;
}