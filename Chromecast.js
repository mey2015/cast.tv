
    const videoElement = document.getElementById('main-video');
    const chromecastButton = document.getElementById('chromecast');
    let castSession = null;
    let remotePlayer = null;
    let remotePlayerController = null;

// ฟังก์ชันเริ่มต้น Chromecast API
function initChromecast() {
    if(typeof chrome === undefined) {
      return;
    }

    // ตั้งค่า interval เพื่อตรวจสอบว่า Cast API พร้อมใช้งานแล้วหรือไม่
    var loadCastInterval = setInterval(function() {
        if (chrome.cast.isAvailable) {
            clearInterval(loadCastInterval); // หยุด interval เมื่อ API พร้อม
            initCastApi(); // เริ่มต้น Cast API
            buttonEvents(); // ตั้งค่า Event Listener สำหรับปุ่ม
            console.log('Google Cast API is ready.');
        } else {
            console.log('Google Cast API is not yet available.');
        }
    }, 1000); // ตรวจสอบทุกๆ 1 วินาที
}

// ฟังก์ชันสำหรับเริ่มต้น Cast Context
function initCastApi() {
    cast.framework.CastContext.getInstance().setOptions({
        // ใช้ ID สำหรับ Default Media Receiver ซึ่งอนุญาตให้เล่นวิดีโอทั่วไปได้
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        // กำหนดนโยบายการเข้าร่วมเซสชันอัตโนมัติ (เช่น จะเข้าร่วมเซสชันที่เริ่มจาก origin เดียวกัน)
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });
}

// ฟังก์ชันสำหรับเชื่อมต่อกับเซสชันการแคสต์
function connectToSession() {
    return Promise.resolve()
    .then(() => {
        var castSession = cast.framework.CastContext.getInstance().getCurrentSession();
        // หากไม่มีเซสชันปัจจุบัน ให้ร้องขอเซสชันใหม่
        if (!castSession) {
            return cast.framework.CastContext.getInstance().requestSession()
            .then(() => {
                // เมื่อได้เซสชันมาแล้ว ให้ส่งคืนเซสชันนั้น
                return Promise.resolve(cast.framework.CastContext.getInstance().getCurrentSession());
            });
        }
        // หากมีเซสชันอยู่แล้ว ให้ส่งคืนเซสชันนั้นทันที
        return Promise.resolve(castSession);
    });
}

// ฟังก์ชันสำหรับตั้งค่า Event Listener บนปุ่มต่างๆ
function buttonEvents() {
    // เลือกปุ่ม Cast โดยตรง
    document.querySelector('.chromecast').addEventListener('click', function(event) {
        launchApp(); // เมื่อคลิกปุ่ม Cast ให้เริ่มแคสต์
    });

    // เลือกส่วนควบคุมการแคสต์
    const castingControls = document.querySelector('.js-casting-controls');
    castingControls.addEventListener('click', function(event) {
        // ตรวจสอบว่าปุ่มใดถูกคลิกภายในส่วนควบคุม
        if (event.target.classList.contains('js-play')) {
            togglePlayPause(); // เล่น/หยุดชั่วคราว
        }
        if (event.target.classList.contains('js-pause')) {
            togglePlayPause(); // เล่น/หยุดชั่วคราว
        }
        if (event.target.classList.contains('js-stop')) {
            stopApp(); // หยุดการแคสต์
        }
    });
}

// ฟังก์ชันสำหรับเริ่มต้นการแคสต์วิดีโอ
function launchApp() {
    console.log('Attempting to launch cast session...');


    // เชื่อมต่อกับเซสชัน Chromecast
    return connectToSession()
    .then((session) => {
        // ดึง URL ของวิดีโอจากแท็ก <video> โดยตรง
        var videoSrc = document.querySelector('.source').getAttribute('src');
        if (!videoSrc) {
            throw new Error('Video source not found.');
        }
          // หยุดวิดีโอท้องถิ่นชั่วคราวเมื่อทำการแคสต์
          videoElement.pause();
        // สร้าง MediaInfo object สำหรับวิดีโอที่จะแคสต์
        var mediaInfo = new chrome.cast.media.MediaInfo(videoSrc);
        mediaInfo.contentType = 'video/mp4'; // กำหนดประเภทของสื่อ

        // สร้าง LoadRequest
        var request = new chrome.cast.media.LoadRequest(mediaInfo);
        request.autoplay = true; // ตั้งค่าให้เล่นอัตโนมัติเมื่อแคสต์

        // โหลดมีเดียไปยังอุปกรณ์ Chromecast
        return session.loadMedia(request);
    })
    .then(() => {
        console.log('Media loaded successfully on Chromecast.');
        listenToRemote(); // เริ่มฟังการเปลี่ยนแปลงจากรีโมท (อุปกรณ์ Chromecast)
    })
    .catch((error) => {
        console.error('Error launching cast session:', error);

        // หากเกิดข้อผิดพลาด ให้คืนค่าการแสดงผลเดิม
        document.querySelector('.js-video-element').style.display = 'block'; //❌
        document.querySelector('.js-casting-controls').setAttribute('aria-hidden', 'true');
    });
}

// ฟังก์ชันสำหรับฟังการควบคุมจากรีโมท (อุปกรณ์ Chromecast)
function listenToRemote() { //❌
    var player = new cast.framework.RemotePlayer(); //❌
    var playerController = new cast.framework.RemotePlayerController(player); //❌

    // เมื่อสถานะของ Player มีการเปลี่ยนแปลง (เช่น เล่น/หยุดชั่วคราว)
    playerController.addEventListener(
        cast.framework.RemotePlayerEventType.ANY_CHANGE, function() {
            // คุณสามารถอัปเดตสถานะปุ่ม Play/Pause บนหน้าเว็บได้ที่นี่
            console.log('Remote player status changed. Is paused:', player.isPaused);
        }
    );

    // เมื่อสถานะการเชื่อมต่อมีการเปลี่ยนแปลง
    playerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED, function() {
            if (!player.isConnected) {
                console.log('Remote player disconnected. Stopping app.'); //❌
                stopApp(); // หากหลุดการเชื่อมต่อ ให้หยุดการแคสต์
            }
        }
    );
}

// ฟังก์ชันสำหรับสลับสถานะเล่น/หยุดชั่วคราว
function togglePlayPause() {
    var player = new cast.framework.RemotePlayer();
    var playerController = new cast.framework.RemotePlayerController(player);
    playerController.playOrPause();
    console.log('Toggling play/pause on remote device.'); //❌
}

// ฟังก์ชันสำหรับหยุดการแคสต์
function stopApp() {
    var castSession = cast.framework.CastContext.getInstance().getCurrentSession();
    if (castSession) {
        castSession.endSession(true); // สิ้นสุดเซสชันการแคสต์
        console.log('Cast session ended.'); //❌
    }
    // คืนค่าการแสดงผลวิดีโอและซ่อนส่วนควบคุมการแคสต์
    document.querySelector('.js-video-element').style.display = 'block'; //❌
    document.querySelector('.js-casting-controls').setAttribute('aria-hidden', 'true');
}

// เริ่มต้นกระบวนการ Chromecast เมื่อ DOM โหลดเสร็จสมบูรณ์
window.addEventListener('load', initChromecast);
