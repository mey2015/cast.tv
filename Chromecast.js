   // const videoElement = document.getElementById('main-video');
  //  const chromecastButton = document.getElementById('chromecastButton');
    let castSession = null;
    let remotePlayer = null;
    let remotePlayerController = null;


    function initChromecast() {

      if (!window.chrome || !window.chrome.cast) {
        console.warn("Chromecast API not available. Make sure it's loaded and supported.");
        chromecastButton.setAttribute('data-cast-state', 'NO_DEVICES_AVAILABLE');
        return;
      }


      cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
      });


      cast.framework.CastContext.getInstance().addEventListener(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        (event) => {
          updateCastButtonState(event.castState);
          if (event.castState === cast.framework.CastState.NOT_CONNECTED) {

            if (!videoElement.paused) {
              videoElement.play();
            }
          }
        }
      );


      remotePlayer = new cast.framework.RemotePlayer();
      remotePlayerController = new cast.framework.RemotePlayerController(remotePlayer);


      remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
        () => {
          console.log('Remote player paused status:', remotePlayer.isPaused);

        }
      );

      remotePlayerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
        () => {
          console.log('Remote player connected status:', remotePlayer.isConnected);
          if (!remotePlayer.isConnected && castSession) {

            console.log('Chromecast session ended due to remote player disconnection.');

            if (videoElement.paused) {
              videoElement.play();
            }
          }
        }
      );


      chromecastButton.addEventListener('click', launchCastApp);


      updateCastButtonState(cast.framework.CastContext.getInstance().getCastState());
    }


    function updateCastButtonState(castState) {
      chromecastButton.setAttribute('data-cast-state', castState);
      if (castState === cast.framework.CastState.NO_DEVICES_AVAILABLE) {
        chromecastButton.style.display = 'none';
      } else {
        chromecastButton.style.display = 'block';
      }
    }


    function connectToSession() {
      castSession = cast.framework.CastContext.getInstance().getCurrentSession();
      if (!castSession) {
        return cast.framework.CastContext.getInstance().requestSession()
          .then((session) => {
            castSession = session;
            return session;
          });
      }
      return Promise.resolve(castSession);
    }


    function launchCastApp() {
      connectToSession()
        .then((session) => {
          if (!session) {
            console.error('Failed to get Cast session.');
            return;
          }


          videoElement.pause();

          const currentVideoSource = videoElement.querySelector('source') ?
            videoElement.querySelector('source').src : videoElement.src;

          if (!currentVideoSource) {
            console.error('No video source found to cast.');
            return;
          }

          const mediaInfo = new chrome.cast.media.MediaInfo(currentVideoSource);


          mediaInfo.contentType = 'video/mp4'; 


          const metadata = new chrome.cast.media.GenericMediaMetadata();
          metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
          metadata.title = "Sintel Trailer";
          // metadata.images = [new chrome.cast.Image('URL_TO_VIDEO_THUMBNAIL.jpg')]; // Optional thumbnail
          mediaInfo.metadata = metadata;

          const loadRequest = new chrome.cast.media.LoadRequest(mediaInfo);
          loadRequest.autoplay = true;

          return session.loadMedia(loadRequest);
        })
        .then(() => {
          console.log('Media loaded successfully on Chromecast.');

        })
        .catch((error) => {
          console.error('Error launching Cast app or loading media:', error);

          if (videoElement.paused) {
            videoElement.play();
          }
        });
    }


    window.__onGCastApiAvailable = function(isAvailable) {
      if (isAvailable) {
        initChromecast();
      } else {
        console.warn("Chromecast API not available.");
        chromecastButton.setAttribute('data-cast-state', 'NO_DEVICES_AVAILABLE');
      }
    };

