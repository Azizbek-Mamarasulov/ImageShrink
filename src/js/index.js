const { ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');

const { WARNING, ERROR, DEFAULT_FOLDER_NAME } = require('./js/consts');

class Destination {
    destination = null;
    constructor(){
        this.setPath();
    };

    getItem() {
        if (!this.destination) {
            let dest = ipcRenderer.sendSync('path-get');
            this.destination = dest ? dest : path.join(os.homedir(), 'ImageShrink');
            ipcRenderer.send('path-set', this.destination);
        }
        return this.destination;
    };
    setItem(value) {
        ipcRenderer.send('path-set', value);
        this.destination = value;
        this.setPath(value);
    }
    setPath(value = this.getItem()) {
        document.getElementById('output-path').innerHTML = value;
    }
}

const Dest = new Destination();

window.onload = () => {
    const form = document.getElementById('image-form')
    const destBtn = document.getElementById('dest-btn');

    form.addEventListener('submit', formHandler);
    destBtn.addEventListener('click', destBtnHandler)
}

const formHandler = async (e) => {
    e.preventDefault();
    const slider = document.getElementById('slider');
    const imgPath = document.getElementById('img').files[0]?.path;
    const quality = slider.value;

    if (!imgPath) {
        ipcRenderer.send('alert', {
            type: WARNING,
            title: "Empty",
            message: "Pick a file",
            detail: "File type must be JPEG or PNG"
        });
        return;
    }

    const button = document.getElementById('submit');
    const spinnerContainer = document.getElementById('spinner-container');
    button.disabled = true;
    spinnerContainer.style.display = 'flex';

    try {
        const res = await ipcRenderer.invoke('image-minimize', {
            imgPath,
            quality,
            dest: Dest.getItem()
        });
        if (res) {
            M.toast({
                html: `Image resized to ${quality}% quality`
            });
        }
    } catch (err) {
        ipcRenderer.send('alert', {
            type: ERROR,
            title: "Resizing Error",
            message: err.message ? err.message : 'Error occured while file is being resize!',
            detail: err.description
        })
    } finally {
        button.disabled = false;
        spinnerContainer.style.display = 'none';
    }
}

const destBtnHandler = () => {
    ipcRenderer.invoke('select-dir')
        .then(dir => {
            if (Array.isArray(dir) && dir.length > 0) {
                const folder = dir[0];
                const test = /^\w:(\/|\\)$/.test(folder);
                if (test) {
                    Dest.setItem(folder + DEFAULT_FOLDER_NAME);
                } else {
                    Dest.setItem(folder);
                }
            }
        })
        .catch(err => {
            ipcRenderer.send('alert', {
                type: ERROR,
                title: err.name,
                message: err.message,
                detail: err.description
            })
        })
}