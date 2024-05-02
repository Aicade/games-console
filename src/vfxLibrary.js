// VFX Library for Phaser 3

export class VFXLibrary {
    constructor(scene) {
        this.scene = scene;
    }

    // Function to shake the camera for 1 second
    shakeCamera(duration = 500, intensity = 0.01) {
        this.scene.cameras.main.shake(duration, intensity);
    }

    // Function to rotate a game object 360 degrees only once
    rotateGameObject(gameObject, duration = 1000, angle = 360, repeat = 0) {

        this.scene.tweens.add({
            targets: gameObject,
            angle: angle,
            duration: duration,
            ease: 'Linear',
            repeat: repeat,
            onComplete: () => {
                gameObject.angle = 0; // Reset the angle after rotation
            }
        });
    }

    // Function to scale a game object up and down in a loop
    scaleGameObject(gameObject, amount = 1.2, duration = 1000, repeat = -1) {
        const scaleAmount = gameObject.scale * amount;

        this.scene.tweens.add({
            targets: gameObject,
            scaleX: scaleAmount,
            scaleY: scaleAmount,
            duration: duration,
            yoyo: true,
            repeat: repeat
        });
    }

    // Function to create a circle texture
    addCircleTexture(name, color = 0xff0000, opacity = 1, radius = 50) {
        const graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(color, opacity);
        graphics.fillCircle(radius, radius, radius);
        graphics.generateTexture(name, radius * 2, radius * 2);
    }

    // Function to create an emitter
    createEmitter(texture, x, y, scaleStart = 0.1, scaleEnd = 0, lifespan = 200) {
        return this.scene.add.particles(x, y, texture, {
            speed: { min: 100, max: 200 },
            scale: { start: scaleStart, end: scaleEnd },
            blendMode: 'NORMAL',
            lifespan: lifespan,
            emitting: false,
        });
    }

    // Function to add glow to a game object
    addGlow(gameObject, intensity = 0.1, color = 0xffff00) {
        gameObject.setTint(color);
        gameObject.setAlpha(intensity);
    }

    // Function to shake a game object
    shakeGameObject(gameObject, duration = 100, intensity = 10) {
        const initialX = gameObject.x;
        const initialY = gameObject.y;

        this.scene.tweens.add({
            targets: gameObject,
            x: { value: initialX - intensity, duration: duration / 2, yoyo: true, ease: 'Quad.easeInOut' },
            y: { value: initialY + intensity, duration: duration / 2, yoyo: true, ease: 'Quad.easeInOut' },
            onComplete: () => {
                gameObject.x = initialX;
                gameObject.y = initialY;
            }
        });
    }

    addShine(gameObject, duration = 1000, alpha = 0.5) {
        const shine = this.scene.add.graphics();

        shine.fillStyle(0xffffff, alpha); // White color with specified alpha
        shine.fillCircle(0, 0, 50); // Adjust circle size as needed

        gameObject.setMask(shine.createGeometryMask());
        shine.x = gameObject.x;
        shine.y = gameObject.y;

        // Tween to animate shine effect
        this.scene.tweens.add({
            targets: shine,
            scaleX: 2, // Adjust scale factor as needed
            scaleY: 2, // Adjust scale factor as needed
            duration: duration,
            alpha: 0, // Fade out the shine
            onComplete: () => {
                shine.destroy();
            }
        });
    }

    blinkEffect(object, duration = 300, blinks = 3) {
        this.blinkTween && this.blinkTween.stop();
        object.setAlpha(0);
        this.blinkTween = this.scene.tweens.add({
            targets: object,
            alpha: 1,
            duration: duration,
            yoyo: true,
            repeat: blinks - 1,
            ease: 'Power1',
            onComplete: () => {
                object.setAlpha(0);
            },
            onStop: () => {
                object.setAlpha(0);
            }
        })
    }
}

export default VFXLibrary;
