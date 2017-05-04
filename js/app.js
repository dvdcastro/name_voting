(function () {

  'use strict';
  // Utils
  var slugify = function(strToSlugify) {
    if (!strToSlugify)
      return;

    // make lower case and trim
    var slug = strToSlugify.toLowerCase().trim();

    // replace invalid chars with spaces
    slug = slug.replace(/[^a-z0-9\s-]/g, ' ');

    // replace multiple spaces or hyphens with a single hyphen
    slug = slug.replace(/[\s-]+/g, '-');

    return slug;
  };

  var slugifyFilter = function() {
    return slugify;
  };

  firebase.initializeApp(config.firebase);

  var auth = firebase.auth();
  var storage = firebase.storage();
  var database = firebase.database();

  var app = angular.module("app", ["chart.js", "markdown", "ngRoute", "ngSanitize"])
    .config(function(markdownConfig){
      // Disable sanitization.
      markdownConfig.sanitize = false;
      // Escape html
      markdownConfig.escapeHtml = false;
    })
    .config(function($routeProvider) {
      $routeProvider
        .when("/voting/:votingroomkey", {
          templateUrl : 'partials/app_main.html',
          controller: 'AppCtrl',
          controllerAs: 'vm'
        }).when("/admin", {
        templateUrl : 'partials/app_main.html',
        controller: 'AppCtrl',
        controllerAs: 'vm'
      }).when("/", {
        templateUrl : 'partials/room_pick.html',
        controller: 'RoomPickCtrl',
        controllerAs: 'vm'
      }).otherwise({
        templateUrl : 'partials/room_pick.html',
        controller: 'AppCtrl',
        controllerAs: 'vm'
      });
    })
    .controller("AppCtrl",
    ['$scope', '$interval', '$timeout', '$routeParams', '$filter', '$location',
    function ($scope, $interval, $timeout, $routeParams, $filter, $location) {

      var vm = this;

      vm.votingrooms = {};

      vm.roomCount = 0;

      vm.initializedRooms = {};

      vm.chartSeries = ['Votes'];

      vm.chartOptions = {
        legend: {
          display: true
        },
        scales: {
          yAxes: [{
            ticks: {
              max: 10,
              min: 0,
              stepSize: 2
            }
          }]
        }
      };

      vm.queryData = function() {
        if (vm.isAdmin()) {
          var votingroomsref = database.ref('votingrooms');
          votingroomsref.on('child_added', vm.refreshVotingRoom);
          votingroomsref.on('child_changed', vm.refreshVotingRoom);
          votingroomsref.on('child_removed', vm.onVotingRoomRemoved);
        } else if (vm.isVoting()) {
          var votingroomsref = database.ref('votingrooms/' + vm.votingroomkey);
          votingroomsref.on('value', vm.refreshVotingRoom);
          $('#welcomeModal').modal({
            backdrop: 'static'
          });
        }
      };

      vm.init = function() {
        vm.action = $location.path();
        vm.votingroomkey = $routeParams.votingroomkey;
      };

      vm.addVotingRoom = function() {
        var votingroomsref = database.ref('votingrooms');
        var newRoomRef = votingroomsref.push();

        vm.roomCount ++;
        var roomObj = {
          name: 'Nameless voting room ' + vm.roomCount,
          votes: {},
          id: vm.roomCount
        };
        roomObj.slug = slugify(roomObj.name);

        newRoomRef.set(roomObj);
      };

      vm.refreshVotingRoom = function(data) {
        // $timeout(function () {
        //   $scope.$apply(function(){
        //     console.log('Refreshing: ', data.val().name);
            // Initialize room panel
            var initialized = vm.initializedRooms[data.key];
            vm.initializedRooms[data.key] = true;

            // Get room data
            vm.votingrooms[data.key] = data.val();
            var rid = vm.votingrooms[data.key].id;
            vm.roomCount = vm.roomCount > rid ? vm.roomCount : rid;

            // Apply visuals if not initialized
            if (!initialized) {
              $timeout(function(){
                if(!vm.currRoom) {
                  vm.pickRoom(vm.votingrooms[data.key]);
                  $('#collapse-' +  rid).collapse();
                } else {
                  $('#collapse-' +  rid).collapse('hide');
                }
              }, 500);
            } else if (vm.currRoom && vm.currRoom.id === vm.votingrooms[data.key].id) {
              vm.pickRoom(vm.votingrooms[data.key]);
            }
          // });
        // });
      };

      vm.onVotingRoomRemoved = function(data) {
        $timeout(function () {
          $scope.$apply(function(){
            delete vm.votingrooms[data.key];
          });
        });
      };

      vm.removeVotingRoom = function(room) {
        var key = vm.getVotingRoomKey(room.id);
        if(key) {
          database.ref('votingrooms/' + key).remove();
        }
      };

      vm.getVotingRoomKey = function(rid) {
        var res = null;
        angular.forEach(vm.votingrooms, function(room, key) {
          if(room.id === rid) {
            res = key;
          }
        });
        return res;
      };

      vm.getVotingRoomKey = function(rid) {
        var res = null;
        angular.forEach(vm.votingrooms, function(room, key) {
          if(room.id === rid) {
            res = key;
          }
        });
        return res;
      };

      vm.isAdmin = function() {
        return vm.action == '/admin';
      };

      vm.isVoting = function() {
        return vm.action.indexOf('/voting') !== -1 && vm.votingroomkey;
      };

      vm.updateRoomName = function(room) {
        var key = vm.getVotingRoomKey(room.id);
        if(key) {
          database.ref('votingrooms/' + key).update({
            name: room.name,
            slug: slugify(room.name)
          });
        }
      };

      vm.addName = function(room) {
        var key = vm.getVotingRoomKey(room.id);
        if(!key) return;

        var namesRef = database.ref('votingrooms/'+key+'/votingnames');
        var newNameRef = namesRef.push();
        newNameRef.set({
          name: 'New name'
        });

        if(!vm.isAdmin() && vm.isVoting()) {
          vm.addNameToPickedParticipant(newNameRef.key);
        }
      };

      vm.updateVotingnameName = function(room, vnkey, votingname) {
        votingname.editing = false;
        var key = vm.getVotingRoomKey(room.id);
        if(key) {
          database.ref('votingrooms/' + key + '/votingnames/' + vnkey).update({
            name: votingname.name
          });
        }
      };

      vm.removeVotingname = function(room, vnkey) {
        var key = vm.getVotingRoomKey(room.id);
        if(key) {
          database.ref('votingrooms/' + key + '/votingnames/' + vnkey).remove();
        }
      };

      vm.addParticipant = function(room) {
        var key = vm.getVotingRoomKey(room.id);
        if(!key) return;

        var participantsRef = database.ref('votingrooms/'+key+'/participants');
        var newParticipantRef = participantsRef.push();
        newParticipantRef.set({
          name: 'New participant'
        });
      };

      vm.updateParticipantName = function(room, pkey, participant) {
        participant.editing = false;
        var key = vm.getVotingRoomKey(room.id);
        if(key) {
          database.ref('votingrooms/' + key + '/participants/' + pkey).update({
            name: participant.name
          });
        }
      };

      vm.removeParticipant = function(room, pkey) {
        var key = vm.getVotingRoomKey(room.id);
        if(key) {
          database.ref('votingrooms/' + key + '/participants/' + pkey).remove();
        }
      };

      vm.pickParticipant = function(room, pkey) {
        vm.pickedParticipant = room.participants[pkey];

        if(!vm.pickedParticipant.votes) {
          vm.pickedParticipant.votes = {};
          angular.forEach(vm.currRoom.votingnames, function(votingname, vkey) {
            vm.pickedParticipant.votes[vkey] = { value: config.defaults.startvote };
          });
        }

        vm.pickedParticipantKey = pkey;
        vm.pickedParticipantRoomId = room.id;
      };

      vm.isParticipantVoting = function(room) {
        return vm.pickedParticipantKey && vm.pickedParticipantRoomId == room.id;
      };

      vm.getEmojiFor = function(value) {
        var res = '';
        switch(value) {
          case 0:
          case 1:
            res = '&#x1f616';
            break;
          case 2:
          case 3:
            res = '&#x1f611';
            break;
          case 4:
          case 5:
            res = '&#x1f610';
            break;
          case 6:
          case 7:
            res = '&#x1f60c';
            break;
          case 8:
          case 9:
            res = '&#x1f600';
            break;
          case 10:
            res = '&#x1f606';
            break;
        }
        return res;
      };

      vm.updateVote = function(room, pkey, vnkey, participant) {
        var key = vm.getVotingRoomKey(room.id);
        if(key) {
          if (!participant.votes[vnkey]) {
            participant.votes[vnkey] = { value: config.defaults.startvote };
          }
          database.ref('votingrooms/' + key + '/participants/' + pkey + '/votes/' + vnkey).set({
            'value': participant.votes[vnkey].value
          });
        }
      };

      vm.pickRoom = function(pickedRoom) {
        if (vm.pickedParticipantKey) {
          if(vm.currRoom && pickedRoom.id !== vm.currRoom.id) {
            delete vm.pickedParticipantKey;
            delete vm.pickedParticipant;
            delete vm.pickedParticipantRoomId;
          } else {
            vm.pickedParticipant = pickedRoom.participants[vm.pickedParticipantKey];
          }
        }

        vm.currRoom = pickedRoom;
        angular.forEach(vm.votingrooms, function(room) {
          if (!vm.isCurrRoom(room)) {
            $('#collapse-' + room.id).collapse('hide');
          } else {
            $('#collapse-' + room.id).collapse('show');
          }
        });
        vm.calculateChartData();
      };

      vm.calculateChartData = function() {
        $timeout(function(){
          $scope.$apply(function(){
            vm.chartLabels = [];
            vm.chartData = [];
            vm.votingData = [];
            vm.numVotes = 0;
            angular.forEach(vm.currRoom.votingnames, function(votingname, vkey) {
              var label = votingname.name;
              var sum = 0, numVotes = 0;
              angular.forEach(vm.currRoom.participants, function(participant, pkey) {
                if (!participant.votes) {
                  participant.votes = {};
                }

                if(!participant.votes[vkey]) {
                  participant.votes[vkey] = { value: config.defaults.startvote };
                }

                sum +=  participant.votes[vkey].value;
                numVotes ++;
              });
              vm.chartLabels.push(label);
              vm.votingData.push(Math.round(sum/numVotes));
              vm.numVotes = vm.numVotes > numVotes ? vm.numVotes : numVotes;
            });
            vm.chartData.push(vm.votingData);
          });
        }, 250);
      };

      vm.isCurrRoom = function(room) {
        return vm.currRoom && room.id === vm.currRoom.id;
      };

      vm.goToMain = function() {
        $timeout(function(){
          $location.path('/');
        }, 250);
      };

      vm.loginAsNewParticipant = function() {
        $('#registerModal').modal({
          backdrop: 'static'
        });
      };

      vm.registerParticipant = function() {
        if (!vm.newParticipantName || vm.newParticipantName == '' || !vm.newParticipantPassword || vm.newParticipantPassword == '') {
          vm.newParticipantError = 'Name and/or password cannot be empty.';
        } else {
          delete vm.newParticipantError;
          $('#registerModal').modal('hide');
          var key = vm.getVotingRoomKey(vm.currRoom.id);
          if(!key) return vm.goToMain();

          var participantsRef = database.ref('votingrooms/'+key+'/participants');
          var newParticipantRef = participantsRef.push();
          newParticipantRef.set({
            name: vm.newParticipantName,
            password: vm.newParticipantPassword
          });

          vm.pickParticipant(vm.currRoom, newParticipantRef.key);

          $('#collapse-' + vm.currRoom.id).collapse('show');
        }
      };

      vm.loginAsParticipant = function(pkey) {
        vm.pickParticipant(vm.currRoom, pkey);
        $('#loginModal').modal({
          backdrop: 'static'
        });
      };

      vm.execParticipantLogin = function() {
        if (!vm.currPassword || vm.currPassword == '') {
          vm.loginParticipantError = 'Password cannot be empty.';
        } else if (vm.pickedParticipant.password != vm.currPassword) {
          vm.loginParticipantError = 'The password is incorrect, please try again.';
        } else {
          $('#loginModal').modal('hide');
          $('#collapse-' + vm.currRoom.id).collapse('show');
        }
      };

      vm.canChangeName = function(nkey) {
        return vm.isAdmin() || (vm.pickedParticipant && vm.pickedParticipant.owns && vm.pickedParticipant.owns[nkey]);
      };

      vm.addNameToPickedParticipant = function(nkey){
        var key = vm.getVotingRoomKey(vm.currRoom.id);
        if(!key) return vm.goToMain();

        var participantRef = database.ref('votingrooms/'+key+'/participants/' + vm.pickedParticipantKey);
        var updates = {};
        updates['/owns/' + nkey] = true;
        participantRef.update(updates);
      };

      auth.onAuthStateChanged(function(user) {
        if (user) {
          // console.log('Anonymous user signed-in.', user);
          self.user = user;
        } else {
          // console.log('There was no anonymous session. Creating a new anonymous user.');
          // Sign the user in anonymously since accessing Storage requires the user to be authorized.
          auth.signInAnonymously();
        }
        vm.queryData();
      });

      vm.init();
    }])
    .controller("RoomPickCtrl",
    ['$scope', '$interval', '$timeout', '$routeParams', '$filter', '$location',
    function ($scope, $interval, $timeout, $routeParams, $filter, $location) {
      var vm = this;

      vm.init = function(){

      };

      vm.queryData = function() {
        var votingroomsref = database.ref('votingrooms');
        votingroomsref.once('value', vm.refreshVotingRoomList);
      };

      vm.refreshVotingRoomList = function(data) {
        $timeout(function () {
          $scope.$apply(function(){
              vm.rooms = data.val();
          });
        });
      };

      auth.onAuthStateChanged(function(user) {
        if (user) {
          // console.log('Anonymous user signed-in.', user);
          self.user = user;
        } else {
          // console.log('There was no anonymous session. Creating a new anonymous user.');
          // Sign the user in anonymously since accessing Storage requires the user to be authorized.
          auth.signInAnonymously();
        }
        vm.queryData();
      });

      vm.init();
    }])
    .filter('slugify', slugifyFilter);

}());

angular.element(document).ready(function() {
  angular.bootstrap(document, ['app']);
});