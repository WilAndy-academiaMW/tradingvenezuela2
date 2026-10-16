
        // Asegurarnos de que todos los menús arranquen ocultos
        document.querySelectorAll('.dropdown-content').forEach(menu => {
            menu.style.display = 'none';
        });

        document.addEventListener('click', function(event) {
            // 1. Verificamos si tocaste un botón principal
            const trigger = event.target.closest('.dropdown-trigger');

            if (trigger) {
                // Buscamos el menú que le pertenece a ese botón
                const parent = trigger.closest('.dropdown');
                const menu = parent.querySelector('.dropdown-content');

                // 2. Cerramos todos los demás a la fuerza bruta
                document.querySelectorAll('.dropdown-content').forEach(m => {
                    if (m !== menu) m.style.display = 'none';
                });

                // 3. Abrimos o cerramos el que tocaste
                if (menu.style.display === 'block') {
                    menu.style.display = 'none';
                } else {
                    menu.style.display = 'block';
                }

            } else {
                // 4. Si tocas cualquier otra cosa (el fondo, otro div), cerramos todo
                document.querySelectorAll('.dropdown-content').forEach(m => {
                    m.style.display = 'none';
                });
            }
        });
