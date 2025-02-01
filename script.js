'use strict';

class WorkOut {
    date = new Date();
    id = (Date.now() + '').slice(-10); // Date.now() gives the current timestamp of the date
    // which can be used to for creating the id
    clicks = 0;
    constructor(coords, distance, duration)
    {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription()
    {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;

    }

    click()
    {
        this.clicks++;
    }
};

class Running extends WorkOut {
    type = 'running'

    constructor(coords, distance, duration, cadence)
    {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace()
    {
        // min/km
        this.pace = this.duration/this.distance;
        return this.pace;
    }
};

class Cycling extends WorkOut {
    type = 'cycling'

    constructor(coords, distance, duration, elevationGain)
    {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed()
    {
        // km/h
        this.speed = this.distance/(this.duration/60);
        return this.speed;
    }
};



//////////////////////////////////////////////////////////////
// Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    // private properties are being created with the name of #map, #mapEvent
    #map;
    #mapZoomLevel = 13;
    #mapEvent; 
    #workouts = [];

    constructor()
    {
        // Get the position
        this._getPosition();

        // Get the localStorage
        this._getLocalStorage();

        // When submitting the form, we need to display the marker, so for that we will write the
        // below eventListener

        form.addEventListener('submit', this._newWorkOut.bind(this));

        // When changing the input value to running, we want to display Cadence
        // When changing the input value to cycling, we want to display Elev-Gain

        // No use of the this keyword in the function which we are calling
        // So, no need to bind the data
        inputType.addEventListener('change', this._toggleElevationField);

        // This function will used so that if we click on a particular workout then we will get
        // to position of markUp. 
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() 
    {
        if(navigator.geolocation)
        {
            // here nav.geolocation api will call the callBack this._loadMap as regular
            // function call, and as we know that in case of regular function call
            // this keyword is undefined, so for resolving the error will use the bind method
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this) , function() {
                alert('Could not get your position');
            })
        }
    }

    _loadMap(position) 
    {
        // gets exxuted when the position can be determined by ourselves
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        // console.log(`https://www.google.com/maps/@${latitude},${longitude},14z?entry=ttu&g_ep=EgoyMDI1MDEyOC4wIKXMDSoASAFQAw%3D%3D`)
        
        // Here the L works like Intl(Internationalization) keyword which we were using
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // 13 is for the amount of zoom which we need initially while
        // displaying the map.
        
        // Code from the leaflet library
        // Here the map is made up with the help of tiles and we are using the openstreet map
        // We can also change the style how we want to see the map : .org -> .fr/hot/
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Instead of using the addEventListner method to listen to the event, we will use the .on method
        // from the leaflet library

        // Without the bind, the this keyword is attached to the map
        // So, want it to get attached with the object itself, so we will use the bind method
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        })
        
    }

    _showForm(mapE) 
    {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm()
    {
        // Empty the inputs
        inputDistance.value = '';
        inputCadence.value = '';
        inputDuration.value = '';
        inputElevation.value = '';

        // hide the form 
        form.style.display = 'none';
        form.classList.add('hidden'); // The problem with directly adding the hidden class element
        // is that we were seeing a an animation which displays the form to go to the uppward
        // direction
        // To get rid of that we have used a clever method of using the setTimeOut function
        // to get the display the after 1 seconds, so that the form gets displayed at the same
        // position.
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() 
    {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkOut(e) 
    {
        e.preventDefault();
        // returns if the function which is passed is finite or not
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));

        const isPositive = (...inputs) => inputs.every(inp => inp > 0);

        // e.preventDefault();
        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        // Check if data is valid

        // If workout running, create running workout object
        if(type === 'running')
        {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if(!validInputs(distance, duration, cadence) || !isPositive(distance, duration, cadence))
            {
                return alert('Inputs have to be positive numbers');
            }

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // If workout cycling, create cycling workout object
        if(type === 'cycling')
        {
            const elevationGain = +inputElevation.value;
            // Check if the data is Valid
            if(!validInputs(distance, duration, elevationGain) || !isPositive(distance, duration))
            {
                return alert('Inputs have to be positive numbers');
            }

            workout = new Cycling([lat, lng], distance, duration, elevationGain);
        }

        // Add new object to workout array
        this.#workouts.push(workout);
        // console.log(this.#workouts);

        // Render workout on map as marker
        this._renderWorkoutMarker(workout);
        
       

        // Render the workout on the list
        this._renderWorkout(workout);

        // Hide the form + Clear the input fields
        this._hideForm();

        // Set localStorage to all the workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) 
    {
         // The below code is used for creating a markup, for the map
         L.marker(workout.coords).addTo(this.#map)
         .bindPopup(L.popup({
             maxWidth: 250,
             minWidth: 100,    // Setting the properties of the popup in which we want to see it.
             autoClose: false, // We can set the size of popup, we can also take care of the autoClose
             closeOnClick: false, // Can read about these stuff from the MDN documentation
             className: `${workout.type}-popup`
         }))
         .setPopupContent(`${workout.name === 'running' ? '🏃‍♂️' : '⚡️'} ${workout.description}`) // in this function we need to pass in the string otherwise we will get an error
         .openPopup();
    }

    _renderWorkout(workout)
    {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">Running on April 14</h2>
                <div class="workout__details">
                <span class="workout__icon">${workout.name === 'running' ? '🏃‍♂️' : '⚡️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;

        if(workout.type === 'running')
        {
            html += `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
                </div>
            </li>
            `;
        }

        if(workout.type === 'cycling')
        {
            html += `
                <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
                </div>
            </li>
            `;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e)
    {
        const workoutEl = e.target.closest('.workout');
        // console.log(workoutEl);

        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        // console.log(workout);

        // Now to reach to the position of the map's position where we have the marker which we
        // have clicked

        // arguments -> coords, zoomLevel, object
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        }); 


        workout.click();
        // console.log(workout.clicks);
    }

    _setLocalStorage()
    {
        // localStorage is an api which is used to store the data in terms of {key, value}
        // pair. Here we convert the JSON to stringify with the help of JSON.stringify() method
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage()
    {
        const data = JSON.parse(localStorage.getItem('workouts'));
        // console.log(data);

        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        })
    }

    reset() // public method to restore the localStorage to empty
    {
        localStorage.removeItem('workouts');
        location.reload(); // location is an api which is used to reload the page
    }
};

const app = new App();    