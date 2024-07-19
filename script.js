document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const groupFile = document.getElementById('groupFile').files[0];
    const roomFile = document.getElementById('roomFile').files[0];

    if (!groupFile || !roomFile) {
        alert('Please upload both CSV files.');
        return;
    }

    try {
        const groupData = await parseCSV(groupFile);
        const roomData = await parseCSV(roomFile);

        const groups = parseGroupData(groupData);
        const rooms = parseRoomData(roomData);

        // Separate boys and girls
        const boysGroups = groups.filter(group => group.gender.includes('Boys'));
        const girlsGroups = groups.filter(group => group.gender.includes('Girls'));

        const boysRooms = rooms.filter(room => room.gender.includes('Boys'));
        const girlsRooms = rooms.filter(room => room.gender.includes('Girls'));

        const boysAllocation = allocateRooms(boysGroups, boysRooms);
        const girlsAllocation = allocateRooms(girlsGroups, girlsRooms);

        const allocation = [...boysAllocation, ...girlsAllocation];

        displayResults(allocation);
        createDownloadLink(allocation);

    } catch (error) {
        console.error('Error processing files:', error);
    }
});

async function parseCSV(file) {
    const text = await file.text();
    return text.trim().split('\n').map(row => row.split(','));
}

function parseGroupData(data) {
    return data.slice(1).map(row => ({
        groupId: row[0],
        members: parseInt(row[1], 10),
        gender: row[2]
    }));
}

function parseRoomData(data) {
    return data.slice(1).map(row => ({
        hostelName: row[0],
        roomNumber: row[1],
        capacity: parseInt(row[2], 10),
        gender: row[3]
    }));
}

function allocateRooms(groups, rooms) {
    const allocation = [];

    // Sort rooms and groups
    rooms.sort((a, b) => a.capacity - b.capacity);
    groups.sort((a, b) => a.members - b.members);

    groups.forEach(group => {
        let allocated = false;
        for (let i = 0; i < rooms.length; i++) {
            const room = rooms[i];
            if (room.capacity === group.members) {
                allocation.push({ ...group, hostelName: room.hostelName, roomNumber: room.roomNumber });
                room.capacity = 0; // Room fully allocated
                allocated = true;
                break;
            } else if (room.capacity > group.members) {
                allocation.push({ ...group, hostelName: room.hostelName, roomNumber: room.roomNumber, membersAllocated: group.members });
                room.capacity -= group.members;
                allocated = true;
                break;
            }
        }

        if (!allocated) {
            let remainingMembers = group.members;
            for (let i = 0; i < rooms.length && remainingMembers > 0; i++) {
                const room = rooms[i];
                if (room.capacity > 0) {
                    if (room.capacity >= remainingMembers) {
                        allocation.push({ ...group, hostelName: room.hostelName, roomNumber: room.roomNumber, membersAllocated: remainingMembers });
                        room.capacity -= remainingMembers;
                        remainingMembers = 0;
                    } else {
                        allocation.push({ ...group, hostelName: room.hostelName, roomNumber: room.roomNumber, membersAllocated: room.capacity });
                        remainingMembers -= room.capacity;
                        room.capacity = 0;
                    }
                }
            }
        }
    });

    return allocation;
}

function displayResults(allocation) {
    const tableBody = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    allocation.forEach(item => {
        const row = tableBody.insertRow();
        row.insertCell(0).innerText = item.groupId;
        row.insertCell(1).innerText = item.hostelName;
        row.insertCell(2).innerText = item.roomNumber;
        row.insertCell(3).innerText = item.membersAllocated || item.members;
    });
}

function createDownloadLink(allocation) {
    const csvContent = "data:text/csv;charset=utf-8," +
        allocation.map(item => `${item.groupId},${item.hostelName},${item.roomNumber},${item.membersAllocated || item.members}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute("download", "allocation.csv");
    downloadLink.style.display = 'block';
    downloadLink.innerText = 'Download CSV';
}
