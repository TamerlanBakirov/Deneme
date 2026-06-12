const LEVELS = [
  {
    "rows": 4,
    "cols": 4,
    "arrows": [
      {
        "r": 3,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 2,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 3,
        "dir": "right"
      }
    ],
    "solutionLength": 4
  },
  {
    "rows": 4,
    "cols": 4,
    "arrows": [
      {
        "r": 2,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 0,
        "c": 3,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 3,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 3,
        "dir": "left"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "up"
      }
    ],
    "solutionLength": 6
  },
  {
    "rows": 5,
    "cols": 5,
    "arrows": [
      {
        "r": 2,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 0,
        "dir": "down"
      },
      {
        "r": 2,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 2,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 4,
        "dir": "right"
      },
      {
        "r": 3,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 1,
        "c": 2,
        "dir": "up"
      }
    ],
    "solutionLength": 8
  },
  {
    "rows": 5,
    "cols": 5,
    "arrows": [
      {
        "r": 1,
        "c": 3,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 4,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 2,
        "dir": "up"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 2,
        "c": 0,
        "dir": "down"
      },
      {
        "r": 2,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 2,
        "dir": "left"
      },
      {
        "r": 4,
        "c": 3,
        "dir": "down"
      },
      {
        "r": 2,
        "c": 1,
        "dir": "up"
      }
    ],
    "solutionLength": 10
  },
  {
    "rows": 5,
    "cols": 5,
    "arrows": [
      {
        "r": 1,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 3,
        "dir": "left"
      },
      {
        "r": 4,
        "c": 1,
        "dir": "down"
      },
      {
        "r": 0,
        "c": 2,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 3,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 4,
        "c": 2,
        "dir": "right"
      },
      {
        "r": 1,
        "c": 2,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 4,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 3,
        "dir": "down"
      }
    ],
    "solutionLength": 12
  },
  {
    "rows": 6,
    "cols": 6,
    "arrows": [
      {
        "r": 0,
        "c": 4,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 2,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 4,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 4,
        "c": 5,
        "dir": "down"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 5,
        "c": 0,
        "dir": "right"
      },
      {
        "r": 5,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 1,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 4,
        "dir": "down"
      }
    ],
    "solutionLength": 14
  },
  {
    "rows": 6,
    "cols": 6,
    "arrows": [
      {
        "r": 5,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 1,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 4,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 3,
        "dir": "left"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 0,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 4,
        "dir": "down"
      },
      {
        "r": 2,
        "c": 2,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 5,
        "dir": "right"
      },
      {
        "r": 3,
        "c": 5,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 2,
        "dir": "up"
      },
      {
        "r": 0,
        "c": 3,
        "dir": "up"
      },
      {
        "r": 5,
        "c": 5,
        "dir": "right"
      }
    ],
    "solutionLength": 16
  },
  {
    "rows": 6,
    "cols": 6,
    "arrows": [
      {
        "r": 4,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 5,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 4,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 5,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 5,
        "c": 4,
        "dir": "down"
      },
      {
        "r": 4,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 4,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 5,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 0,
        "c": 4,
        "dir": "right"
      },
      {
        "r": 5,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 2,
        "c": 3,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 5,
        "dir": "right"
      }
    ],
    "solutionLength": 18
  },
  {
    "rows": 7,
    "cols": 7,
    "arrows": [
      {
        "r": 4,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 3,
        "dir": "up"
      },
      {
        "r": 5,
        "c": 2,
        "dir": "left"
      },
      {
        "r": 4,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 2,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 6,
        "c": 4,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 0,
        "c": 3,
        "dir": "up"
      },
      {
        "r": 5,
        "c": 6,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 2,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 6,
        "c": 6,
        "dir": "down"
      },
      {
        "r": 4,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 6,
        "c": 5,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 3,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 2,
        "dir": "up"
      },
      {
        "r": 5,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 2,
        "c": 2,
        "dir": "up"
      },
      {
        "r": 0,
        "c": 1,
        "dir": "up"
      }
    ],
    "solutionLength": 22
  },
  {
    "rows": 7,
    "cols": 7,
    "arrows": [
      {
        "r": 3,
        "c": 5,
        "dir": "left"
      },
      {
        "r": 5,
        "c": 5,
        "dir": "right"
      },
      {
        "r": 1,
        "c": 6,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 2,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 5,
        "c": 3,
        "dir": "down"
      },
      {
        "r": 4,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 6,
        "c": 5,
        "dir": "down"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 4,
        "c": 0,
        "dir": "down"
      },
      {
        "r": 5,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 2,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 4,
        "c": 2,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 1,
        "dir": "right"
      },
      {
        "r": 5,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 6,
        "c": 0,
        "dir": "down"
      },
      {
        "r": 1,
        "c": 3,
        "dir": "left"
      },
      {
        "r": 6,
        "c": 4,
        "dir": "down"
      },
      {
        "r": 2,
        "c": 5,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 1,
        "c": 2,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 1,
        "dir": "left"
      }
    ],
    "solutionLength": 26
  },
  {
    "rows": 7,
    "cols": 7,
    "arrows": [
      {
        "r": 2,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 3,
        "c": 2,
        "dir": "up"
      },
      {
        "r": 6,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 5,
        "c": 3,
        "dir": "up"
      },
      {
        "r": 2,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 0,
        "c": 2,
        "dir": "left"
      },
      {
        "r": 4,
        "c": 6,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 3,
        "dir": "left"
      },
      {
        "r": 4,
        "c": 5,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 2,
        "dir": "left"
      },
      {
        "r": 6,
        "c": 5,
        "dir": "down"
      },
      {
        "r": 0,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 6,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 6,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 0,
        "c": 5,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 6,
        "dir": "up"
      },
      {
        "r": 2,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 6,
        "c": 6,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 5,
        "dir": "right"
      },
      {
        "r": 1,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 6,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 3,
        "dir": "up"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "up"
      },
      {
        "r": 5,
        "c": 5,
        "dir": "right"
      },
      {
        "r": 5,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 4,
        "c": 4,
        "dir": "down"
      }
    ],
    "solutionLength": 30
  },
  {
    "rows": 8,
    "cols": 8,
    "arrows": [
      {
        "r": 1,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 4,
        "c": 0,
        "dir": "right"
      },
      {
        "r": 4,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 4,
        "c": 5,
        "dir": "right"
      },
      {
        "r": 3,
        "c": 7,
        "dir": "left"
      },
      {
        "r": 4,
        "c": 2,
        "dir": "up"
      },
      {
        "r": 0,
        "c": 3,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 1,
        "dir": "up"
      },
      {
        "r": 6,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 5,
        "c": 1,
        "dir": "down"
      },
      {
        "r": 5,
        "c": 3,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 7,
        "c": 5,
        "dir": "down"
      },
      {
        "r": 7,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 2,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 6,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 5,
        "dir": "up"
      },
      {
        "r": 1,
        "c": 7,
        "dir": "up"
      },
      {
        "r": 2,
        "c": 4,
        "dir": "up"
      },
      {
        "r": 6,
        "c": 1,
        "dir": "down"
      },
      {
        "r": 6,
        "c": 0,
        "dir": "down"
      },
      {
        "r": 4,
        "c": 7,
        "dir": "down"
      },
      {
        "r": 3,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 3,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 2,
        "c": 7,
        "dir": "right"
      },
      {
        "r": 7,
        "c": 2,
        "dir": "down"
      },
      {
        "r": 7,
        "c": 7,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 2,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 2,
        "dir": "left"
      },
      {
        "r": 7,
        "c": 4,
        "dir": "down"
      },
      {
        "r": 0,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 6,
        "c": 7,
        "dir": "right"
      },
      {
        "r": 0,
        "c": 0,
        "dir": "left"
      },
      {
        "r": 5,
        "c": 7,
        "dir": "right"
      },
      {
        "r": 1,
        "c": 1,
        "dir": "left"
      },
      {
        "r": 1,
        "c": 0,
        "dir": "left"
      }
    ],
    "solutionLength": 36
  }
];
