function getRandomArbitrary(min, max, M) {
    var tmp = Math.random() * (max - min) + min;
    while (elemExist(M, tmp.toString())) {
      tmp = Math.random() * (max - min) + min;
    }
    return tmp;
  }
  function elemExist(M, elem) {
    for (var i=0;i<M.length;i++) {
      if (M[i]==elem)
        return true;
    }
    return false;
  }

  function setRandomMatrix(M, n) {
    var Matrix_random = [];
    for (var i=0;i<n*n; i++) {
      var random = Math.floor(getRandomArbitrary(0, 20000, Matrix_random));
      M[i] = M[i].concat(random.toString());
      Matrix_random.push(random.toString());
    }

    return Matrix_random;
  }


  module.exports = {
    getRandomArbitrary,
    elemExist,
    setRandomMatrix
  };