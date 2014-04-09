//MIT-licensed code
//from here: https://raw.github.com/danielribeiro/WebGLCraft/master/lib/camera.coffee
//converted to regular js

MouseEvent = {
    isLeftButton: function(event) {
        return event.which === 1;
    },
    isRightButton: function(event) {
        return event.which === 3;
    },
    isLeftButtonDown: function(event) {
        return event.button === 0 && this.isLeftButton(event);
    }
};

THREE.DragControls = function(camera, myDomElement) {
    
    var scope = this;
    this.object = camera;
    this.target = new THREE.Vector3(0, 0, 0);
    this.domElement = myDomElement || document;
    this.cameraBaseHeight = 0;
    this.object.position.y = this.cameraBaseHeight;
    this.speed = 0.045;
    this.lookSpeed = 0.60;
    this.mouseX = 0;
    this.mouseY = 0;
    this.lat = 0;
    this.lon = -90;
    this.deltaX = 0;
    this.deltaY = 0;
    this.mouseDragOn = false;
    this.anchorx = null;
    this.anchory = null;
    this.mouseLocked = false;
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity = new THREE.Vector3();
    this.canLookVertical = true; //change this to enable vertical look
    this.movementOneTimeCallback = null; //set a function here and it will be called once when the user moves
    this.lookOneTimeCallback = null; //set a function here and it will be called once when the user looks around
    this.desiredTarget = null;
    this.overridingTaget = false;
    this.lookDisabled = false;
    this.moveOverride = false;

    this.enableMouseLocked = function() {
        return scope.mouseLocked = true;
    };
    this.disableMouseLocked = function() {
        return scope.mouseLocked = false;
    };

    var onMouseEnter = function(event) {
        if (!MouseEvent.isLeftButtonDown(event)) {
            return scope.onMouseUp(event);
        }
    };

    var onMouseDown = function(event) {
        if (!MouseEvent.isLeftButton(event)) {
            return;
        }
        if (scope.mouseLocked && scope.domElement !== document) {
            scope.domElement.focus();
        }
        scope.anchorx = event.pageX;
        scope.anchory = event.pageY;
        scope.setMouse(scope.anchorx, scope.anchory);
        scope.mouseDragOn = true;
        document.addEventListener('mousemove', onMouseMove, false);
        return false;
    };

    var onMouseUp = function(event) {
        scope.mouseDragOn = false;
        document.addEventListener('mousemove', null, false);
        return false;
    };

    var onMouseMove = function(event) {
        if (scope.lookDisabled) {
            return;
        }
        var e, x, y;
        if (scope.mouseDragOn && !scope.lookDisabled) {
            scope.setMouse(event.pageX, event.pageY);
        } else if (scope.mouseLocked) {
            e = event.originalEvent;
            x = e.movementX || e.mozMovementX || e.webkitMovementX;
            y = e.movementY || e.mozMovementY || e.webkitMovementY;
            scope.setDelta(x, y);
        }
        if (scope.lookOneTimeCallback != null) {
            scope.lookOneTimeCallback();
            scope.lookOneTimeCallback = null;
        }
    };

    this.onMouseMove = onMouseMove;
    this.onMouseDown = onMouseDown;
    this.onMouseUp = onMouseUp;
    this.onMouseEnter = onMouseEnter;

    
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mouseenter', onMouseEnter, false);

    var onKeyDown = function (event) {
        
        switch (event.keyCode) {

            //case 38: // up
            case 87: // w
                scope.moveForward = true;
                break;

            //case 37: // left
            case 65: // a
                scope.moveLeft = true; 
                break;

            //case 40: // down
            case 83: // s
                scope.moveBackward = true;
                break;

            //case 39: // right
            case 68: // d
                scope.moveRight = true;
                break;
                
            case 32:
                scope.setDesiredTarget(new THREE.Vector3(0, 0, 0));
                break;
        }
        if (scope.movementOneTimeCallback != null && (scope.moveForward || scope.moveLeft || scope.moveBackward || scope.moveRight)) {
            scope.movementOneTimeCallback();
            scope.movementOneTimeCallback = null;
        }
    };

    var onKeyUp = function (event) {

        switch (event.keyCode) {

            //case 38: // up
            case 87: // w
                scope.moveForward = false;
                break;

            //case 37: // left
            case 65: // a
                scope.moveLeft = false;
                break;

            //case 40: // down
            case 83: // a
                scope.moveBackward = false;
                break;

            //case 39: // right
            case 68: // d
                scope.moveRight = false;
                break;
        }

    };

    this.onKeyDown = onKeyDown;
    this.onKeyUp = onKeyUp;

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    this.setMouse = function(x, y) {
        scope.mouseX = x;
        if (scope.canLookVertical) {
            scope.mouseY = y;
            return scope.setDelta(x - scope.anchorx, y - scope.anchory);
        } else {
            return scope.setDelta(x - scope.anchorx, scope.anchory);
        }
        
     };

    this.setDelta = function(x, y) {
        scope.deltaX = x;
        if (scope.canLookVertical) {
            scope.deltaY = y;
        }
        return;
     };

    

    this.halfCircle = Math.PI / 180;

    this.viewDirection = function() {
        return scope.target.clone().sub(scope.object.position);
     };

    this.updateLook = function() {
        var cos, p, phi, sin, theta;
        sin = Math.sin, cos = Math.cos;
        phi = (90 - scope.lat) * scope.halfCircle;
        theta = scope.lon * scope.halfCircle;
        p = scope.object.position;
        /*assoc(scope.target, {
            x: p.x + 100 * sin(phi) * cos(theta),
            y: p.y + 100 * cos(phi),
            z: p.z + 100 * sin(phi) * sin(theta)
        });*/
        scope.target = new THREE.Vector3(
            p.x + 100 * sin(phi) * cos(theta),
            p.y + 100 * cos(phi),
            p.z + 100 * sin(phi) * sin(theta)
        );
        scope.object.lookAt(scope.target);
     };

     this.updateMove = function(delta) {
        scope.velocity.x *= 0.7;
        scope.velocity.z *= 0.7;
         scope.velocity.y *= 0.7;
        if (scope.velocity.length() < 0.05) {
            scope.velocity.x = 0;
            scope.velocity.y = 0;
            scope.velocity.z = 0;
        }

        //scope.velocity.y -= 0.05 * delta;

        if (scope.moveForward) scope.velocity.z -= scope.speed * delta;
        if (scope.moveBackward) scope.velocity.z += scope.speed * delta;

        if (scope.moveLeft) scope.velocity.x -= scope.speed * delta;
        if (scope.moveRight) scope.velocity.x += scope.speed * delta;

        scope.object.translateX(scope.velocity.x);
        scope.object.translateY(scope.velocity.y);
        scope.object.translateZ(scope.velocity.z);
     };

    this.update = function(delta) {

                //move
        delta *= 0.1;
        
        var noLook = false;
        
        var max, min;
        max = Math.max, min = Math.min;
        if (!scope.moveOverride) {
            if (!(scope.mouseDragOn || scope.mouseLocked)) {
                noLook = true;
            }else if (scope.mouseDragOn && scope.mouseX === scope.anchorx && scope.mouseY === scope.anchory) {
                noLook = true;
            } else if (scope.mouseLocked) {
                if (scope.deltaX === scope.previousDeltaX && scope.deltaY === scope.previousDeltaY) {
                    noLook = true;
                } else {
                    scope.previousDeltaX = scope.deltaX;
                    scope.previousDeltaY = scope.deltaY;
                    scope.anchorx = window.innerWidth / 2;
                    scope.anchory = window.innerHeight / 2;
                }
            } else if (scope.mouseDragOn) {
                if (scope.mouseX === scope.anchorx && scope.mouseY === scope.anchory) {
                    noLook = true;
                } else {
                    scope.anchorx = scope.mouseX;
                    scope.anchory = scope.mouseY;
                }
                
            }
        }
        
        if (scope.overridingTaget) {
            scope.target.lerp(scope.desiredTarget, 0.2);
            scope.object.lookAt(scope.target);
            var normalToTarget = new THREE.Vector3(scope.target.x, scope.target.y, scope.target.z);
            normalToTarget.sub(scope.object.position);
            normalToTarget.normalize();
           // normalToTarget.multiply(100);
            var phi = scope.wrapDeg(Math.acos(normalToTarget.y));
            var theta = scope.wrapDeg(Math.asin(normalToTarget.z / Math.sin(phi)));
            scope.lon = normalToTarget.x < 0 ? scope.wrapDeg(180 - (theta / scope.halfCircle)) : scope.wrapDeg(theta / scope.halfCircle);
            scope.lat = normalToTarget.x < 0 ? scope.wrapDeg(90 - (phi / scope.halfCircle)) : scope.wrapDeg(90 - (phi / scope.halfCircle));
            //scope.lat = max(-85, min(85, scope.lat));
            if (scope.target.distanceTo(scope.desiredTarget) < 0.5) {
                scope.overridingTaget = false;
            }
            return;
        }

        
        scope.updateMove(delta);

        if (!noLook) {
        
            scope.lon += scope.deltaX * scope.lookSpeed;
            scope.lat -= scope.deltaY * scope.lookSpeed;
            scope.lat = max(-85, min(85, scope.lat));
            scope.updateLook();

        }

     };

     this.setDesiredTarget = function (target) {
        scope.desiredTarget = target;
        scope.overridingTaget = true;
     }

     this.constrainPosition = function (negX, posX, negZ, posZ) {
        if (scope.object.position.x < negX) {
            scope.object.position.x = negX;
        } else if (scope.object.position.x > posX) {
            scope.object.position.x = posX;
        }
        if (scope.object.position.z < negZ) {
            scope.object.position.z = negZ;
        } else if (scope.object.position.z > posZ) {
            scope.object.position.z = posZ;
        }
    };
    
    this.wrapDeg = function(val) {
        if (val < -180){
            val += 360;
        } else if (val > 180) {
            val -= 360;
        }
        return val;
    }
};