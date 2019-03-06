
module.exports = class Training{
    // state increasing or decreasing  => very or little
    // ingredient => ex suger, coffee, coco , etc
    // frontire => list of previoes value
    // new state of value
    constructor(state, ingredient, frontier, new_state){
        this.state = state
        this.ingredient = ingredient;
        this.frontire =  frontier;
        this.newState = new_state;
    }

    setIncrease(){
        this.newState = this.frontire[1] + this.adjustValue(this.frontire[0], this.frontire[1], this.state);  
    }

    setDecrease(){      
        this.newState = this.frontire[1] - this.adjustValue(this.frontire[0], this.frontire[1], this.state);
    }

    getNewStateFlavor(){
        return {ingredient:this.ingredient, value: this.newState}
    }

    adjustValue(value1, value2, state){
        let average_value = Math.abs(value1-value2)/2;
        switch(state){
            case 0:{
                return average_value
            }
            case 1:{
                return average_value/2
            }
            case 11:{
                return 0;
            }
        }
    }
}
